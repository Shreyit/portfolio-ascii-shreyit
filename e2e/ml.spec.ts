import { expect, test, type Page } from "@playwright/test";

async function openLab(page: Page) {
  await page.goto("/");
  const section = page.getByRole("region", { name: "ML laboratory" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-ml-ready]")).toHaveAttribute(
    "data-ml-ready",
    "true",
  );
  return section;
}

test("server-rendered lab shows real results without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const section = page.getByRole("region", { name: "ML laboratory" });
  await expect(section).toContainText("catches 18 of 36 defaulters");
  await context.close();
});

test("switching models updates the confusion matrix and metrics", async ({
  page,
}) => {
  const section = await openLab(page);
  await section.getByRole("radio", { name: "majority baseline" }).click();
  await expect(section).toContainText("catches 0 of 36 defaulters");
  await expect(section.getByRole("button", { name: /^TN 144/ })).toBeVisible();

  await section.getByRole("radio", { name: "support vector machine" }).click();
  await expect(section).toContainText("catches 17 of 36 defaulters");
});

test("hovering a cell explains it in lender terms", async ({ page }) => {
  const section = await openLab(page);
  await section.getByRole("button", { name: /^FN / }).hover();
  await expect(section.locator(".ml-explain")).toContainText(
    "defaulted, but the model approved them",
  );
});

test("ranking by recall reorders the leaderboard", async ({ page }) => {
  const section = await openLab(page);
  await section.getByRole("radio", { name: "recall" }).click();
  const board = section.locator(".ml-board");
  await expect(board).toContainText(/1\. logistic regression/);
  await expect(board).toContainText(/6\. majority baseline/);
});

test("the threshold view shows the real trade-off", async ({ page }) => {
  const section = await openLab(page);
  await section.getByRole("tab", { name: "decision threshold" }).click();
  await section.getByRole("radio", { name: /≥ 0.3/ }).click();
  await expect(section).toContainText("+7 defaulters caught (18 → 25)");
  await expect(section).toContainText("+10 good borrowers flagged (11 → 21)");
});

test("the fitting slider walks the validation curve", async ({ page }) => {
  const section = await openLab(page);
  await section.getByRole("tab", { name: "over/underfitting" }).click();
  await section.getByRole("radio", { name: "k-nearest neighbours" }).click();
  const slider = section.getByRole("slider");
  await slider.focus();
  await expect(section.locator(".ml-note")).toContainText(
    "k = 1: fit F1 1.000",
  );
  await slider.press("ArrowRight");
  await expect(section.locator(".ml-note")).toContainText(
    "k = 3: fit F1 0.710",
  );
  await expect(section.locator(".ml-note")).toContainText(
    "Best on validation: k = 3",
  );
});
