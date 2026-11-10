import { expect, test } from "@playwright/test";

// The wheel must scroll the page wherever the pointer rests, including over
// lab diagrams and panes that have nothing of their own to scroll.
for (const [name, selector] of [
  ["infra diagram", "[data-infra-ready] figure, [data-infra-ready] pre"],
  ["terminal", ".terminal"],
  ["sql playground", ".sql"],
] as const) {
  test(`wheel over the ${name} scrolls the page`, async ({ page }, info) => {
    test.skip(info.project.name !== "chromium", "wheel is desktop-only");
    await page.goto("/");
    const target = page.locator(selector).first();
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = (await target.boundingBox())!;
    await page.mouse.move(
      box.x + box.width / 2,
      box.y + Math.min(box.height / 2, 200),
    );
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 })
      .toBeGreaterThan(before + 100);
  });
}
