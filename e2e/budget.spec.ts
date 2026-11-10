import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Next 16 + React 19 floor ≈137 KB gz + gsap/lenis ≈28 KB gz + headroom.
// First-load JS must stay under this; Milestone 2 content is server-rendered to help.
const BUDGET_BYTES = 170 * 1024;
const TARGETS = ["/", "/lab/ascii"] as const;

test.describe("bundle budget", () => {
  for (const target of TARGETS) {
    test(`first-load JS gzip total is under 170 KB (${target})`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "chromium project only");

      const pending: Promise<Buffer | null>[] = [];
      page.on("response", (response) => {
        const url = response.url();
        const isJs =
          response.request().resourceType() === "script" || url.endsWith(".js");
        if (!isJs) {
          return;
        }
        pending.push(response.body().catch(() => null));
      });

      await page.goto(target);
      await page.waitForLoadState("networkidle");

      const bodies = (await Promise.all(pending)).filter(
        (body): body is Buffer => body !== null,
      );
      const totalBytes = bodies.reduce(
        (sum, body) => sum + gzipSync(body).length,
        0,
      );
      const totalKb = totalBytes / 1024;

      mkdirSync("test-results", { recursive: true });
      writeFileSync(
        join(
          "test-results",
          target === "/" ? "bundle-budget.json" : "bundle-budget-lab.json",
        ),
        JSON.stringify({ target, totalBytes, totalKb, budgetKb: 170 }, null, 2),
      );

      expect(totalBytes).toBeLessThanOrEqual(BUDGET_BYTES);
    });
  }
});
