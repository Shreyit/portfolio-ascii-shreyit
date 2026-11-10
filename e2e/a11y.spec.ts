import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("accessibility (axe)", () => {
  for (const path of ["/", "/lab/ascii"] as const) {
    test(`${path} has no WCAG 2.1 A/AA violations`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "chromium project only");
      await page.goto(path);
      if (path === "/") {
        // Lazy islands (SQL/ML) load near the viewport — scroll to the
        // bottom first so they are on screen, then wait for them to swap in.
        await page.evaluate(() =>
          window.scrollTo(0, document.body.scrollHeight),
        );
        await page.waitForTimeout(1500);
      }

      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

      if (results.violations.length > 0) {
        for (const violation of results.violations) {
          console.log(`axe violation: ${violation.id} — ${violation.help}`);
          console.log(
            `targets: ${violation.nodes
              .slice(0, 3)
              .map((node) => node.target.join(" "))
              .join(" | ")}`,
          );
        }
      }

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});
