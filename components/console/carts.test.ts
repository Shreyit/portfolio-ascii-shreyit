import { describe, expect, it } from "vitest";
import { projects, skills } from "@/content";
import { buildCarts, press } from "./carts";

describe("skill console", () => {
  const carts = buildCarts(skills, projects);

  it("has one cartridge per resume group, every skill exactly once", () => {
    expect(carts.map((c) => c.title)).toEqual([
      "Programming Languages",
      "AI & LLM Engineering",
      "Data Science & Machine Learning",
      "Databases & Data Engineering",
      "Cloud & DevOps",
      "Analytics & Research Tools",
      "Backend Development",
    ]);
    const all = carts.flatMap((c) => c.skills.map((s) => s.name));
    expect(all).toHaveLength(skills.length);
    expect(all).toContain("DuckDB");
  });

  it("links skills to labs and projects from content only", () => {
    const sk = carts
      .flatMap((c) => c.skills)
      .find((s) => s.name === "scikit-learn")!;
    expect(sk.lab?.href).toBe("#ml-heading");
    expect(sk.projects.length).toBeGreaterThan(0);
  });

  it("d-pad wraps and switching carts resets the cursor", () => {
    let s = { cart: 0, cursor: 0, inspecting: false };
    s = press(s, "up", carts);
    expect(s.cursor).toBe(carts[0]!.skills.length - 1);
    s = press(s, "a", carts);
    expect(s.inspecting).toBe(true);
    s = press(s, "left", carts);
    expect(s).toEqual({ cart: carts.length - 1, cursor: 0, inspecting: false });
  });
});

describe("work links", () => {
  it("names the internship for skills its highlights mention", async () => {
    const { experience } = await import("@/content");
    const carts = buildCarts(skills, projects, experience);
    const find = (n: string) =>
      carts.flatMap((c) => c.skills).find((s) => s.name === n)!;
    expect(find("OpenAI API").projects.join()).toMatch(/AI DataCraftTech/);
    expect(find("Qdrant").projects.join()).toMatch(/AI DataCraftTech/);
    // "R" must not match the "R" in "RAG".
    expect(find("R").projects.join()).not.toMatch(/AI DataCraftTech/);
  });
});
