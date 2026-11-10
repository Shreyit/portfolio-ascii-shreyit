import { expect, test } from "@playwright/test";

const hero = (page: import("@playwright/test").Page) =>
  page.locator("[data-hero-ready]");

test("static contour map is server-rendered without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const pre = hero(page).locator("pre");
  await expect(pre).toBeVisible();
  expect((await pre.textContent())?.replace(/\s/g, "").length).toBeGreaterThan(
    200,
  );
  await context.close();
});

test("the animated map loads after the page is idle and reacts to the pointer", async ({
  page,
}) => {
  await page.goto("/");
  await expect(hero(page)).toHaveAttribute("data-hero-ready", "true", {
    timeout: 10000,
  });
  const canvas = hero(page).locator("canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true", {
    timeout: 10000,
  });

  const snapshot = () =>
    canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  const lifted = await snapshot();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(900);
  expect(await snapshot()).not.toBe(lifted);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the static map and never loads the animation", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(2500);
    await expect(hero(page)).toHaveAttribute("data-hero-ready", "false");
    await expect(hero(page).locator("pre")).toBeVisible();
  });
});
