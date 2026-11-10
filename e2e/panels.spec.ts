import { expect, test } from "@playwright/test";

const PANEL_NAMES = [
  "Research & fieldwork",
  "SQL playground",
  "ML laboratory",
  "Infrastructure simulator",
] as const;

test.describe("lab panels", () => {
  for (const name of PANEL_NAMES) {
    test(`"${name}" is a window-style region`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "chromium project only");
      await page.goto("/");
      const region = page.getByRole("region", { name });
      await region.scrollIntoViewIfNeeded();

      await expect(region).toBeVisible();

      const styles = await region.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          borderTopWidth: cs.borderTopWidth,
          borderTopStyle: cs.borderTopStyle,
          backgroundColor: cs.backgroundColor,
        };
      });
      expect(styles.borderTopWidth).toBe("1px");
      expect(styles.borderTopStyle).toBe("solid");
      expect(styles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(styles.backgroundColor).not.toBe("transparent");

      // Visible title bar: first child with three dots and the command text.
      const bar = region.locator("> div").first();
      await expect(bar).toBeVisible();
      await expect(bar.locator("span")).toHaveCount(4);
    });
  }

  test("panels do not overlap each other", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "chromium project only");
    await page.goto("/");
    // Scroll through so every lazy lab has loaded at its final size.
    for (const name of PANEL_NAMES) {
      await page.getByRole("region", { name }).scrollIntoViewIfNeeded();
    }
    await page.waitForTimeout(500);
    // Compare positions in page coordinates, all measured at once.
    const boxes = await page.evaluate(
      (names) => {
        return names.map((name) => {
          const heading = [...document.querySelectorAll("h2")].find(
            (h) => h.textContent?.trim() === name,
          );
          const r = heading!.closest("section")!.getBoundingClientRect();
          return {
            name,
            top: r.top + window.scrollY,
            bottom: r.bottom + window.scrollY,
          };
        });
      },
      [...PANEL_NAMES],
    );
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        expect(overlap, `"${a.name}" overlaps "${b.name}"`).toBeLessThanOrEqual(
          0,
        );
      }
    }
  });
});
