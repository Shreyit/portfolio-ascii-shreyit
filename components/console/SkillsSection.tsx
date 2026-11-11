import { experience, projects, skills } from "@/content";
import { buildCarts } from "./carts";
import { ConsoleIsland } from "./ConsoleIsland";
import { ConsoleView } from "./ConsoleView";

const ID = "skills";

export function SkillsSection() {
  const carts = buildCarts(skills, projects, experience);
  return (
    <section className="arcade" aria-labelledby={`${ID}-heading`} data-reveal>
      <header className="arcade-head">
        <p className="arcade-kicker" aria-hidden="true">
          player 1 · credits ∞ · hi-score: still learning
        </p>
        <h2 id={`${ID}-heading`}>Skills</h2>
        <p className="arcade-intro">
          Every skill on my resume, on cartridges. Swap carts with the D-pad or
          the shelf, press A to see where a skill shows up on this page, START
          to jump there, SELECT if you are feeling lucky.
        </p>
        <p className="arcade-insert" aria-hidden="true">
          ▶ insert cartridge to continue
        </p>
      </header>
      <ConsoleIsland carts={carts}>
        <ConsoleView cart={0} cursor={0} inspecting={false} carts={carts} />
      </ConsoleIsland>
      {/* The full list, for screen readers and search engines. */}
      <div className="visually-hidden">
        {carts.map((c) => (
          <section key={c.title} aria-label={c.title}>
            <p>{c.title}</p>
            <ul>
              {c.skills.map((s) => (
                <li key={s.name}>{s.name}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
