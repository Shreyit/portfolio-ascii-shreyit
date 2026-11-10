import { expect, test, type Page } from "@playwright/test";

async function openPlayground(page: Page) {
  await page.goto("/");
  const section = page.getByRole("region", { name: "SQL playground" });
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-sql-ready]")).toHaveAttribute(
    "data-sql-ready",
    "true",
  );
  return section;
}

async function runQuery(page: Page, sql: string) {
  const editor = page.getByRole("textbox", { name: "SQL query" });
  await editor.fill(sql);
  await editor.press("ControlOrMeta+Enter");
}

test("static schema is server-rendered without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const tables = page.getByRole("list", { name: "Database tables" });
  await expect(tables).toContainText("projects");
  await expect(tables).toContainText("fieldwork");
  await context.close();
});

test("preset queries run against real SQLite", async ({ page }) => {
  const section = await openPlayground(page);
  await section.getByRole("button", { name: "fieldwork samples" }).click();
  // Choosing a preset only loads it; the Run button invites the click.
  const run = section.getByRole("button", { name: /^run/ });
  await expect(run).toHaveAttribute("data-pending", "true");
  expect(await run.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    "sql-glow",
  );
  await expect(section.getByLabel("Query result")).toHaveCount(0);
  await run.click();
  const status = section.getByRole("status");
  await expect(status).toContainText(/\d+ rows? · [\d.]+ ms/, {
    timeout: 15000,
  });
  const result = section.getByLabel("Query result");
  await expect(result).toContainText("231");
  await expect(result).toContainText("residents surveyed");
  // Accessible table mirrors the ASCII one.
  await expect(result.getByRole("columnheader", { name: "n" })).toHaveCount(1);
});

test("clicking a table queries it", async ({ page }) => {
  const section = await openPlayground(page);
  await section.getByRole("button", { name: /^projects \d+ rows?/ }).click();
  await section.getByRole("button", { name: /^run/ }).click();
  await expect(section.getByLabel("Query result")).toContainText(
    "rinn-microcredit-risk",
    { timeout: 15000 },
  );
  await expect(page.getByRole("textbox", { name: "SQL query" })).toHaveValue(
    /FROM projects/,
  );
});

test("errors are reported and reset restores dropped tables", async ({
  page,
}) => {
  const section = await openPlayground(page);
  await runQuery(page, "SELEC nonsense");
  await expect(section.getByRole("alert")).toContainText("syntax error", {
    timeout: 15000,
  });

  await runQuery(page, "DROP TABLE skills;");
  await expect(section.getByRole("status")).toContainText("ok");
  await runQuery(page, "SELECT COUNT(*) AS n FROM skills;");
  await expect(section.getByRole("alert")).toContainText("no such table");

  await section.getByRole("button", { name: "reset db" }).click();
  await expect(section.getByRole("status")).toContainText("restored");
  await runQuery(page, "SELECT COUNT(*) AS n FROM skills;");
  await expect(section.getByRole("status")).toContainText("1 row");
});

test("a runaway query is cancelled and the page stays responsive", async ({
  page,
}) => {
  const section = await openPlayground(page);
  await runQuery(
    page,
    "WITH RECURSIVE r(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM r) SELECT COUNT(*) FROM r;",
  );
  // The main thread is free while the worker spins.
  const ticks = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const start = performance.now();
        const tick = () => {
          n += 1;
          if (performance.now() - start < 1000) requestAnimationFrame(tick);
          else resolve(n);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(ticks).toBeGreaterThan(20);
  await expect(section.getByRole("alert")).toContainText("cancelled", {
    timeout: 10000,
  });
  await runQuery(page, "SELECT 1 AS ok;");
  await expect(section.getByRole("status")).toContainText("1 row", {
    timeout: 15000,
  });
});
