import { expect, test, type Page } from "@playwright/test";

async function watchH1Opacity(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __h1MinOpacity: number };
    w.__h1MinOpacity = 1;
    const sample = () => {
      const h1 = document.querySelector("h1");
      if (h1) {
        const opacity = Number.parseFloat(getComputedStyle(h1).opacity);
        if (!Number.isNaN(opacity)) {
          w.__h1MinOpacity = Math.min(w.__h1MinOpacity, opacity);
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function minH1Opacity(page: Page): Promise<number> {
  return page.evaluate(
    () => (window as unknown as { __h1MinOpacity: number }).__h1MinOpacity,
  );
}

test("landing page loads and shows the h1", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Shreyit Sinha" }),
  ).toBeVisible();
});

test("no console errors or hydration warnings on load", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  await page.goto("/");
  await page.waitForTimeout(1000);

  expect(problems).toEqual([]);
});

test("no horizontal overflow at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(360);

  const bodyOverflowX = await page.evaluate(
    () => getComputedStyle(document.body).overflowX,
  );
  expect(bodyOverflowX).not.toBe("hidden");
});

test("with no reduced-motion preference, <html> gets the lenis class", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);
});

test("runtime preference change toggles the lenis class", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/lenis/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/lenis/);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveClass(/lenis/);
});

test("h1 opacity never drops below 1 (no-preference)", async ({ page }) => {
  await watchH1Opacity(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(await minH1Opacity(page)).toBe(1);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("page still renders and h1 is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Shreyit Sinha" }),
    ).toBeVisible();
  });

  test("<html> does not get the lenis class", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });

  test("h1 opacity never drops below 1", async ({ page }) => {
    await watchH1Opacity(page);
    await page.goto("/");
    await page.waitForTimeout(1500);
    expect(await minH1Opacity(page)).toBe(1);
  });

  test(".terminal-cursor stays visible for 1.5s", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __cursorMin: { opacity: number; visible: boolean };
      };
      w.__cursorMin = { opacity: 1, visible: true };
      const sample = () => {
        const el = document.querySelector(".terminal-cursor");
        if (el) {
          const style = getComputedStyle(el);
          const opacity = Number.parseFloat(style.opacity);
          const visible = style.visibility === "visible";
          if (!Number.isNaN(opacity)) {
            w.__cursorMin.opacity = Math.min(w.__cursorMin.opacity, opacity);
          }
          w.__cursorMin.visible = w.__cursorMin.visible && visible;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto("/");
    await page.waitForTimeout(1500);
    const result = await page.evaluate(
      () =>
        (
          window as unknown as {
            __cursorMin: { opacity: number; visible: boolean };
          }
        ).__cursorMin,
    );
    expect(result.opacity).toBe(1);
    expect(result.visible).toBe(true);
  });
});

test("content section renders with Rinn and Nainital, no private repo links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 2, name: "Projects" }),
  ).toBeVisible();
  await expect(page.getByText(/Rinn/).first()).toBeVisible();
  await expect(page.getByText(/Nainital/).first()).toBeVisible();

  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
  const privateRepos = [
    "chromolaena-invasion-frontier",
    "nainital_tourism_reearch",
    "nyc-taxi-ml",
    "sankhya_landing",
    "github.com/Shreyit/SANKHYA-Timeline",
    "statistical_modelling_std",
  ];
  // needsReview projects must be hidden from public pages
  const hiddenRepos = [
    "brsr_tool",
    "cdp_analysis",
    "SDG-Streamlit-Interactive-Dashboard",
    "DataCo-Market-Dashboard",
    "my-neovim-ds-config",
  ];
  for (const href of hrefs) {
    for (const repo of [...privateRepos, ...hiddenRepos]) {
      expect(href).not.toContain(repo);
    }
  }
});

test("Sankhya live link is present; no Sankhya GitHub links", async ({
  page,
}) => {
  await page.goto("/");
  const live = page.locator('a[href="https://sankhya-timeline.vercel.app"]');
  await expect(live).toBeVisible();

  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));
  for (const href of hrefs) {
    expect(href).not.toContain("github.com/Shreyit/SANKHYA");
    expect(href).not.toContain("sankhya_landing");
  }
});
