import { expect, test } from "@playwright/test";

test("a slow device steps the effects tier down", async ({ page }, info) => {
  test.skip(
    info.project.name !== "chromium",
    "CPU throttling is chromium-only",
  );
  test.setTimeout(60000);
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.fx), {
      timeout: 15000,
    })
    .toBeTruthy();
  // Simulate a device that cannot keep up: ~30 ms of work every frame.
  await page.evaluate(() => {
    const burn = () => {
      const end = performance.now() + 30;
      while (performance.now() < end);
      requestAnimationFrame(burn);
    };
    requestAnimationFrame(burn);
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.fx), {
      timeout: 30000,
    })
    .not.toBe("high");
});
