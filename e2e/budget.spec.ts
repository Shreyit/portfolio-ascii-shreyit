import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Two budgets, gzip:
// - Critical path: JS requested before the window `load` event — what the
//   page needs to become interactive. Next 16 + React 19 is ≈137 KB on its
//   own, gsap/lenis ≈28 KB, plus a little headroom.
// - Total: everything loaded by network idle, including deferred
//   enhancements (the hero animation starts after load, when the browser is
//   idle, and the scroll-motion layer with ScrollTrigger ≈20 KB). Lazy labs
//   below the fold load only when scrolled to and are not counted here.
const TOTAL_BUDGET_KB = 210;
const TARGETS = [
  // The visitor-facing page.
  { path: "/", criticalKb: 170 },
  // A noindex engine test page that loads the whole ASCII engine eagerly,
  // by design, to benchmark it. Not linked or meant for visitors.
  { path: "/lab/ascii", criticalKb: 175 },
] as const;

test.describe("bundle budget", () => {
  for (const { path: target, criticalKb: CRITICAL_BUDGET_KB } of TARGETS) {
    test(`JS stays within budget (${target})`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "chromium project only");

      let loaded = false;
      page.on("load", () => {
        loaded = true;
      });
      const scripts: Promise<{ bytes: number; critical: boolean }>[] = [];
      page.on("request", (request) => {
        const isJs =
          request.resourceType() === "script" || request.url().endsWith(".js");
        if (!isJs) return;
        const critical = !loaded;
        scripts.push(
          request
            .response()
            .then((r) => r?.body())
            .then((body) => ({
              bytes: body ? gzipSync(body).length : 0,
              critical,
            }))
            .catch(() => ({ bytes: 0, critical })),
        );
      });

      await page.goto(target);
      await page.waitForLoadState("networkidle");
      // Give idle-time enhancements a moment to start and finish loading.
      await page.waitForTimeout(1500);
      await page.waitForLoadState("networkidle");

      const all = await Promise.all(scripts);
      const kb = (xs: typeof all) =>
        xs.reduce((sum, x) => sum + x.bytes, 0) / 1024;
      const criticalKb = kb(all.filter((x) => x.critical));
      const totalKb = kb(all);

      mkdirSync("test-results", { recursive: true });
      writeFileSync(
        join(
          "test-results",
          target === "/" ? "bundle-budget.json" : "bundle-budget-lab.json",
        ),
        JSON.stringify(
          {
            target,
            criticalKb,
            totalKb,
            criticalBudgetKb: CRITICAL_BUDGET_KB,
            totalBudgetKb: TOTAL_BUDGET_KB,
          },
          null,
          2,
        ),
      );

      expect(criticalKb).toBeLessThanOrEqual(CRITICAL_BUDGET_KB);
      expect(totalKb).toBeLessThanOrEqual(TOTAL_BUDGET_KB);
    });
  }
});
