import type {
  Experience,
  ExperienceKey,
  Project,
  Skill,
} from "@/content/schema";

/** Where each lab lives on the page, for the START button. */
export const LABS: Record<ExperienceKey, { name: string; href: string }> = {
  terminal: { name: "the terminal", href: "#main" },
  sql: { name: "SQL playground", href: "#sql-heading" },
  "ml-lab": { name: "ML laboratory", href: "#ml-heading" },
  infra: { name: "AWS simulator", href: "#infra-heading" },
  "research-explorer": { name: "research explorer", href: "#research-heading" },
};

export interface CartSkill {
  name: string;
  /** Lab on this page that uses it, if any. */
  lab: { name: string; href: string } | null;
  /** Projects whose stack lists it, and roles whose highlights name it. */
  projects: string[];
}

export interface Cart {
  /** Cartridge label, e.g. "AI & LLM Engineering". */
  title: string;
  skills: CartSkill[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+]/g, "");

/**
 * One cartridge per resume skill group, in order. Every fact shown on the
 * screen comes from content: the lab link and the projects whose stack
 * names the skill. Nothing is scored or invented.
 */
export function buildCarts(
  skills: readonly Skill[],
  projects: readonly Project[],
  experience: readonly Experience[] = [],
): Cart[] {
  const carts: Cart[] = [];
  for (const skill of skills) {
    let cart = carts.find((c) => c.title === skill.category);
    if (!cart) {
      cart = { title: skill.category, skills: [] };
      carts.push(cart);
    }
    const base = skill.name.replace(/\s*\(.*\)$/, "");
    const key = norm(base);
    // "OpenAI API" is written "OpenAI" in prose; "Embeddings (BGE-M3)" as
    // "BGE-M3". Word-boundary matches only, so "R" never matches "RAG".
    const inner = /\(([^)]+)\)/.exec(skill.name)?.[1];
    const words = [base, base.replace(/\s+APIs?$/, ""), inner]
      .filter((w): w is string => Boolean(w && w.length > 1))
      .map(
        (w) =>
          new RegExp(
            `(^|[^\\w])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`,
            "i",
          ),
      );
    cart.skills.push({
      name: skill.name,
      lab: skill.experience ? LABS[skill.experience] : null,
      projects: [
        ...experience
          .filter((e) => e.highlights.some((h) => words.some((w) => w.test(h))))
          .map((e) => `${e.role}, ${e.organisation}`),
        ...projects
          .filter((p) => p.stack.some((s) => norm(s) === key))
          .map((p) => p.title),
      ],
    });
  }
  return carts;
}

export interface ConsoleState {
  cart: number;
  cursor: number;
  /** Showing the detail card for the selected skill. */
  inspecting: boolean;
}

export type ConsoleInput = "up" | "down" | "left" | "right" | "a" | "b";

/** Pure input handling: wraps around carts and skills. */
export function press(
  state: ConsoleState,
  input: ConsoleInput,
  carts: readonly Cart[],
): ConsoleState {
  const count = carts[state.cart]?.skills.length ?? 0;
  switch (input) {
    case "up":
      return { ...state, cursor: (state.cursor - 1 + count) % count };
    case "down":
      return { ...state, cursor: (state.cursor + 1) % count };
    case "left":
    case "right": {
      const step = input === "left" ? -1 : 1;
      const cart = (state.cart + step + carts.length) % carts.length;
      return { cart, cursor: 0, inspecting: false };
    }
    case "a":
      return { ...state, inspecting: true };
    case "b":
      return { ...state, inspecting: false };
  }
}
