import { expect, test, type Page } from "@playwright/test";

async function openExplorer(page: Page) {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Research & fieldwork" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-research-ready]")).toHaveAttribute(
    "data-research-ready",
    "true",
  );
  return section;
}

test("the explorer is readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const section = page.getByRole("region", { name: "Research & fieldwork" });
  await expect(section).toContainText("Nainital · RII 1.46");
  await expect(section).toContainText("RII: 1.46");
  await context.close();
});

test("hovering Irridex stages explains each one", async ({ page }) => {
  const section = await openExplorer(page);
  await section.getByRole("button", { name: /^Antagonism/ }).hover();
  await expect(section.locator(".ml-note").first()).toContainText(
    "Antagonism: irritation is expressed openly",
  );
});

test("Sangamner grids switch between the two measures", async ({ page }) => {
  const section = await openExplorer(page);
  await section.getByRole("tab", { name: /Sangamner/ }).click();
  await expect(section).toContainText(
    "17.4% of cardholders aware of Ayushman Bharat scheme benefits",
  );
  await section.getByRole("radio", { name: "used at a hospital" }).click();
  await expect(section).toContainText(
    "4.3% of cardholders had used PM-JAY benefits at a hospital",
  );
});

test("the index matrix shows sample sizes and an honest gap", async ({
  page,
}) => {
  const section = await openExplorer(page);
  await section.getByRole("tab", { name: /vulnerability index/ }).click();
  await expect(section).toContainText("team of 4");
  await section.getByRole("cell", { name: /^Tourists, Environmental/ }).hover();
  await expect(section).toContainText("from 311 respondents");
  await section.getByRole("cell", { name: /^Workers, Environmental/ }).hover();
  await expect(section).toContainText("left blank rather than filled");
});
