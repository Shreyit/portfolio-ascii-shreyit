import { expect, test } from "@playwright/test";

test("footer contact section shows all four links", async ({ page }) => {
  await page.goto("/");

  const contact = page.locator("#contact");
  await expect(contact).toBeVisible();

  const links = contact.locator("a");
  await expect(links).toHaveCount(4);

  const hrefs = await links.evaluateAll((anchors) =>
    anchors.map((a) => a.getAttribute("href")),
  );
  expect(hrefs).toEqual([
    "mailto:sinhashreyit@gmail.com",
    "https://www.linkedin.com/in/shreyit-sinha",
    "https://github.com/Shreyit",
    "mailto:m2024bsass027@stud.tiss.ac.in",
  ]);
});

test("external contact links open in a new tab with noopener", async ({
  page,
}) => {
  await page.goto("/");

  const external = page.locator('#contact a[target="_blank"]');
  await expect(external).toHaveCount(2);
  for (const anchor of await external.all()) {
    await expect(anchor).toHaveAttribute("rel", /noopener/);
    await expect(anchor).toHaveAttribute("rel", /noreferrer/);
  }

  const mailtos = page.locator('#contact a[href^="mailto:"]');
  await expect(mailtos).toHaveCount(2);
  for (const anchor of await mailtos.all()) {
    await expect(anchor).not.toHaveAttribute("target", "_blank");
  }
});

test("nav has a contact link pointing at #contact", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator('nav[aria-label="Sections"] a[href="#contact"]'),
  ).toBeVisible();
});

test("phone number appears nowhere in the page HTML", async ({ page }) => {
  const response = await page.goto("/");
  const html = (await response?.text()) ?? "";
  const phone = ["77598", "11300"].join("");
  expect(html).not.toContain(phone);
});
