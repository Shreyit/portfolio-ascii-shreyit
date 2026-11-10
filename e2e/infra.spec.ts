import { expect, test, type Page } from "@playwright/test";

async function openSim(page: Page) {
  await page.goto("/?asciiStats");
  const section = page.getByRole("region", {
    name: "Infrastructure simulator",
  });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-infra-ready]")).toHaveAttribute(
    "data-infra-ready",
    "true",
  );
  return section;
}

const stat = (section: import("@playwright/test").Locator, name: string) =>
  section.locator(".infra-stats div").filter({ hasText: name }).locator("dd");

test("static diagram renders without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const section = page.getByRole("region", {
    name: "Infrastructure simulator",
  });
  await expect(section.locator("pre")).toContainText("CloudFront");
  await expect(section.locator("pre")).toContainText("i-01 v1");
  await context.close();
});

test("the animated canvas renders frames", async ({ page }) => {
  const section = await openSim(page);
  await expect(section.locator(".ascii-canvas")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 10000 },
  );
});

test("a spike scales the group out", async ({ page }) => {
  const section = await openSim(page);
  await expect(stat(section, "in service")).toContainText("2 / 2");
  await section.getByRole("button", { name: /traffic spike/ }).click();
  await expect(stat(section, "requests/s")).toHaveText("360");
  await expect(section.locator(".infra-log")).toContainText("scale out");
  await expect(stat(section, "in service")).toContainText("6 / 6", {
    timeout: 10000,
  });
});

test("a rolling release completes without dropping requests", async ({
  page,
}) => {
  const section = await openSim(page);
  await section.getByRole("button", { name: "deploy new version" }).click();
  await expect(section.locator(".infra-log")).toContainText(
    "release v2 complete · 0 requests dropped",
    { timeout: 30000 },
  );
});

test("a crash is detected and replaced", async ({ page }) => {
  const section = await openSim(page);
  await section.getByRole("button", { name: "crash an instance" }).click();
  await expect(section.locator(".infra-log")).toContainText("crashed");
  await expect(section.locator(".infra-log")).toContainText(
    "ASG replacing it",
    { timeout: 10000 },
  );
  await expect(stat(section, "in service")).toContainText("2 / 2", {
    timeout: 15000,
  });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows a text diagram that still updates", async ({ page }) => {
    const section = await openSim(page);
    await expect(section.locator("canvas")).toHaveCount(0);
    await section.getByRole("button", { name: "crash an instance" }).click();
    await expect(section.locator(".infra-pre")).toContainText(
      "x not responding",
    );
  });
});
