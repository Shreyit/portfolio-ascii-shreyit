import { expect, test } from "@playwright/test";

test("journey map lists every place without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const map = page.getByRole("region", { name: "Where I've lived & worked" });
  for (const place of ["Patna", "Mumbai", "Nainital", "Sangamner", "Gurugram"])
    await expect(map).toContainText(place);
  await expect(map.getByRole("img")).toBeAttached();
  await context.close();
});

test("choosing a place shows its details and the map animates", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "Where I've lived & worked" });
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator("[data-map-ready]")).toHaveAttribute(
    "data-map-ready",
    "true",
  );
  await map.getByRole("button", { name: /Sangamner/ }).click();
  await expect(map.getByRole("button", { name: /Sangamner/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(map).toContainText("116 households surveyed");
  await map.getByRole("button", { name: "play journey" }).click();
  await expect(map).toContainText("Where I'm from.");
});
