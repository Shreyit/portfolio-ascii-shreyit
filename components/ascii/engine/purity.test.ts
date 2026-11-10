import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Needle built by concatenation so this test file does not match itself.
const needle = new RegExp("\\b" + ["re", "act"].join("") + "\\b", "i");

describe("engine purity", () => {
  it("components/ascii/engine contains no UI-framework references", () => {
    const engineDir = join(__dirname);
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
          files.push(path);
        }
      }
    };
    walk(engineDir);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      expect(text, `${file} references the UI framework`).not.toMatch(needle);
    }
  });
});
