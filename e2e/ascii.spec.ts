import { expect, test, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type AsciiStats = Array<{
  frames: number;
  cellsDrawn: number;
  lastFrameMs: number;
}>;

async function cssVar(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (n) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  );
}

async function statsAt(page: Page, index: number) {
  return page.evaluate(
    (i) =>
      (window as unknown as { __asciiStats?: AsciiStats }).__asciiStats?.[i] ??
      null,
    index,
  );
}

test("160x60 instance renders frames and averages under 8ms per frame", async ({
  page,
}) => {
  await page.goto("/lab/ascii?asciiStats");

  await expect
    .poll(async () => (await statsAt(page, 0))?.frames ?? 0, {
      timeout: 5000,
    })
    .toBeGreaterThan(30);

  const samples = await page.evaluate(async () => {
    const out: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 2000) {
      const first = (window as unknown as { __asciiStats?: AsciiStats })
        .__asciiStats?.[0];
      if (first) {
        out.push(first.lastFrameMs);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return out;
  });

  expect(samples.length).toBeGreaterThan(0);
  const average =
    samples.reduce((total, value) => total + value, 0) / samples.length;

  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    join("test-results", "ascii-perf.json"),
    JSON.stringify(
      { averageLastFrameMs: average, samples: samples.length },
      null,
      2,
    ),
  );

  expect(average).toBeLessThan(8);
});

test("off-screen instance pauses and resumes on scroll", async ({ page }) => {
  await page.goto("/lab/ascii?asciiStats");

  await expect
    .poll(async () => (await statsAt(page, 0))?.frames ?? 0, {
      timeout: 5000,
    })
    .toBeGreaterThan(5);

  const secondAtRest = await statsAt(page, 1);
  await page.waitForTimeout(600);
  const secondAfterRest = await statsAt(page, 1);
  expect(secondAfterRest?.frames ?? 0).toBe(secondAtRest?.frames ?? 0);

  await page
    .getByText("Engine test page — not portfolio content.")
    .scrollIntoViewIfNeeded();
  await page.locator(".ascii-figure").nth(1).scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await statsAt(page, 1))?.frames ?? 0, {
      timeout: 5000,
    })
    .toBeGreaterThan(secondAtRest?.frames ?? 0);

  const firstFrames = (await statsAt(page, 0))?.frames ?? 0;
  await page.waitForTimeout(600);
  const firstAfterScroll = (await statsAt(page, 0))?.frames ?? 0;
  expect(firstAfterScroll).toBe(firstFrames);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("pre fallback is visible with non-space content and no frames", async ({
    page,
  }) => {
    await page.goto("/lab/ascii?asciiStats");
    const pre = page.locator(".ascii-pre").first();
    await expect(pre).toBeVisible();

    const text = await pre.textContent();
    expect(text?.replace(/\s/g, "").length).toBeGreaterThan(0);

    const stats = await page.evaluate(
      () =>
        (window as unknown as { __asciiStats?: AsciiStats }).__asciiStats ?? [],
    );
    expect(stats.every((entry) => entry.frames === 0)).toBe(true);
  });
});

test("no layout shift when the canvas swaps in", async ({ page }) => {
  await page.goto("/lab/ascii?asciiStats");
  const figure = page.locator(".ascii-figure").first();

  const before = await figure.boundingBox();
  await expect
    .poll(async () => (await statsAt(page, 0))?.frames ?? 0, {
      timeout: 5000,
    })
    .toBeGreaterThan(0);
  const after = await figure.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(
    Math.abs((after?.width ?? 0) - (before?.width ?? 0)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((after?.height ?? 0) - (before?.height ?? 0)),
  ).toBeLessThanOrEqual(1);
});

test("no horizontal overflow at 360px and no console errors", async ({
  page,
}) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/lab/ascii?asciiStats");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);
  expect(problems).toEqual([]);
});

test("glyphs are visible against the dark background", async ({ page }) => {
  await page.goto("/lab/ascii?asciiStats");
  await expect
    .poll(async () => (await statsAt(page, 0))?.frames ?? 0, {
      timeout: 5000,
    })
    .toBeGreaterThan(0);

  const bg = await cssVar(page, "--bg");
  const ink = await page.evaluate((bgHex) => {
    const [r0, g0, b0] = [1, 3, 5].map((i) =>
      parseInt(bgHex.slice(i, i + 2), 16),
    );
    const lum = (r: number, g: number, b: number) =>
      0.2126 * r + 0.7152 * g + 0.0722 * b;
    const bgLum = lum(r0!, g0!, b0!);
    const canvas = document.querySelector<HTMLCanvasElement>(".ascii-canvas")!;
    const data = canvas
      .getContext("2d")!
      .getImageData(0, 0, canvas.width, canvas.height).data;
    let inkPixels = 0;
    let brighter = 0;
    for (let i = 0; i < data.length; i += 4) {
      const l = lum(data[i]!, data[i + 1]!, data[i + 2]!);
      if (Math.abs(l - bgLum) > 60) {
        inkPixels += 1;
        if (l > bgLum) brighter += 1;
      }
    }
    return { inkPixels, brighter, total: data.length / 4 };
  }, bg);

  // Plenty of clearly visible glyph pixels, lighter than the dark background.
  expect(ink.inkPixels / ink.total).toBeGreaterThan(0.02);
  expect(ink.brighter / ink.inkPixels).toBeGreaterThan(0.99);
});

for (const width of [1280, 360]) {
  test(`canvas exactly fills its figure at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/lab/ascii?asciiStats");
    await expect
      .poll(async () => (await statsAt(page, 0))?.frames ?? 0, {
        timeout: 5000,
      })
      .toBeGreaterThan(0);
    await page.locator(".ascii-figure").nth(1).scrollIntoViewIfNeeded();
    await expect
      .poll(async () => (await statsAt(page, 1))?.frames ?? 0, {
        timeout: 5000,
      })
      .toBeGreaterThan(0);

    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".ascii-figure")].map((f) => {
        const canvas = f.querySelector("canvas")!;
        const fr = f.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        const border = parseFloat(getComputedStyle(f).borderLeftWidth) * 2;
        return {
          inner: [fr.width - border, fr.height - border],
          canvas: [cr.width, cr.height],
          backing: [canvas.width, canvas.height],
          dpr: Math.min(window.devicePixelRatio, 2),
        };
      }),
    );
    for (const box of boxes) {
      expect(Math.abs(box.canvas[0]! - box.inner[0]!)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.canvas[1]! - box.inner[1]!)).toBeLessThanOrEqual(1);
      // Backing store matches the CSS box at the capped device ratio.
      expect(
        Math.abs(box.backing[0]! - box.canvas[0]! * box.dpr),
      ).toBeLessThanOrEqual(1);
    }
    // The 160-column figure never shrinks below a legible size; it scrolls.
    const firstWidth = boxes[0]!.inner[0]!;
    expect(firstWidth).toBeGreaterThanOrEqual(160 * 0.6 * 6 - 2);
  });
}
