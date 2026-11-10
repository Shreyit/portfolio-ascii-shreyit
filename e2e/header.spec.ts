import { expect, test } from "@playwright/test";

test("the header stays pinned and usable while scrolling", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  const before = await header.boundingBox();
  expect(before?.y).toBe(0);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await expect.poll(async () => (await header.boundingBox())?.y).toBe(0);
  await expect(header).toBeVisible();

  // It is opaque: content scrolling underneath does not show through.
  const background = await header.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  expect(background).not.toBe("rgba(0, 0, 0, 0)");

  // Its navigation still works from mid-page.
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("link", { name: "ml" })
    .click();
  await expect(page).toHaveURL(/#ml-heading$/);
  await expect(page.locator("#ml-heading")).toBeInViewport();
});

test("anchored headings are not hidden under the sticky header", async ({
  page,
}) => {
  await page.goto("/#sql-heading");
  const header = (await page.getByRole("banner").boundingBox())!;
  await expect
    .poll(async () => (await page.locator("#sql-heading").boundingBox())?.y)
    .toBeGreaterThanOrEqual(header.y + header.height - 1);
});
