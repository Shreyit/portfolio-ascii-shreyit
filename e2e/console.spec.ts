import { expect, test } from "@playwright/test";

test("every skill is in the page without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const section = page.getByRole("region", { name: "Skills" });
  for (const skill of ["DuckDB", "ATLAS.ti", "LangChain", "FastAPI"])
    await expect(section).toContainText(skill);
  await context.close();
});

test("the console plays with buttons and the keyboard", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Skills" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-console-ready]")).toHaveAttribute(
    "data-console-ready",
    "true",
  );
  // Reaching for the console stops its idle float.
  await section.locator(".console").hover();
  const screen = section.locator(".console-screen");
  await expect(screen).toContainText("Programming Languages");

  await section.getByRole("button", { name: /Right: next cartridge/ }).click();
  await expect(screen).toContainText("AI & LLM Engineering");

  await section.getByRole("button", { name: /^AI & LLM/ }).click();
  await section.getByRole("button", { name: "A: inspect skill" }).click();
  await expect(screen).toContainText("found in");

  // Keyboard on the console itself.
  await section.locator(".console-body").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowLeft");
  await expect(screen).toContainText("Programming Languages");
  await expect(
    section.getByRole("button", { name: /^Programming Languages/ }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("sound mute toggle works and persists across reload", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Skills" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-console-ready]")).toHaveAttribute(
    "data-console-ready",
    "true",
  );
  // Reaching for the console stops its idle float.
  await section.locator(".console").hover();

  const mute = section.getByRole("button", { name: /^Sound (on|off)$/ });
  await expect(mute).toBeVisible();
  await expect(mute).toHaveAttribute("aria-pressed", "false");

  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(mute).toHaveAccessibleName("Sound off");

  await page.reload();
  const sectionAfter = page.getByRole("region", { name: "Skills" });
  await sectionAfter.scrollIntoViewIfNeeded();
  await expect(sectionAfter.locator("[data-console-ready]")).toHaveAttribute(
    "data-console-ready",
    "true",
  );
  await sectionAfter.locator(".console").hover();
  const muteAfter = sectionAfter.getByRole("button", {
    name: /^Sound (on|off)$/,
  });
  await expect(muteAfter).toHaveAttribute("aria-pressed", "true");

  // Leave it the way we found it.
  await muteAfter.click();
  await expect(muteAfter).toHaveAttribute("aria-pressed", "false");
});
