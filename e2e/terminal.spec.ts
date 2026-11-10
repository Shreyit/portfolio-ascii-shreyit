import { expect, test } from "@playwright/test";

const prompt = (page: import("@playwright/test").Page) =>
  page.getByRole("textbox", { name: /visitor@shreyit/ });

test("intro is server-rendered and readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const terminal = page.getByRole("region", { name: "Interactive terminal" });
  await expect(terminal).toContainText("Shreyit Sinha");
  await expect(terminal).toContainText("Tata Institute of Social Sciences");
  await context.close();
});

test("runs typed commands and keeps history", async ({ page }) => {
  await page.goto("/");
  const input = prompt(page);
  await input.click();
  await input.fill("whoami");
  await input.press("Enter");
  const log = page.getByRole("log");
  await expect(log).toContainText("visitor@shreyit:~$ whoami");
  await expect(log).toContainText("Analytics and Sustainability Studies");

  await input.fill("ls projects");
  await input.press("Enter");
  await expect(log).toContainText("rinn-microcredit-risk");

  await input.press("ArrowUp");
  await expect(input).toHaveValue("ls projects");
  await input.press("ArrowUp");
  await expect(input).toHaveValue("whoami");
});

test("highlighted words are runnable buttons", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("log")
    .getByRole("button", { name: "help", exact: true })
    .first()
    .click();
  await expect(page.getByRole("log")).toContainText("search everything");

  await page
    .getByRole("log")
    .getByRole("button", { name: "ls", exact: true })
    .click();
  await page.getByRole("button", { name: "research/" }).click();
  await page.getByRole("button", { name: "nainital-urban-fieldwork" }).click();
  await expect(page.getByRole("log")).toContainText("RII: 1.46");
});

test("tab completes and slash focuses the prompt", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("/");
  const input = prompt(page);
  await expect(input).toBeFocused();
  await input.fill("cat rinn");
  await input.press("Tab");
  await expect(input).toHaveValue("cat rinn-microcredit-risk ");
  await input.press("Enter");
  await expect(page.getByRole("log")).toContainText("0.89 ROC-AUC");
});

test("Tab on an empty prompt moves focus on (no keyboard trap)", async ({
  page,
}) => {
  await page.goto("/");
  const input = prompt(page);
  await input.focus();
  await input.press("Tab");
  await expect(input).not.toBeFocused();
});

test("theme command switches the site theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  const input = prompt(page);
  await input.fill("theme");
  await input.press("Enter");
  await expect(html).not.toHaveAttribute("data-theme", before ?? "");
  await expect(
    page.getByRole("button", { name: "light theme" }),
  ).toHaveAttribute("aria-pressed", before === "light" ? "false" : "true");
});

test("clear empties the scrollback", async ({ page }) => {
  await page.goto("/");
  const input = prompt(page);
  await input.fill("clear");
  await input.press("Enter");
  await expect(page.getByRole("log")).not.toContainText("Shreyit Sinha");
});
