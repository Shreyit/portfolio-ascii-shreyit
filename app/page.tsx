import { HeroHeading } from "@/components/HeroHeading";
import { InfraSection } from "@/components/infra/InfraSection";
import { MlSection } from "@/components/ml/MlSection";
import { ResearchSection } from "@/components/research/ResearchSection";
import { SqlSection } from "@/components/sql/SqlSection";
import { Terminal } from "@/components/terminal/Terminal";
import { runCommand } from "@/components/terminal/commands";
import type { TerminalData } from "@/components/terminal/types";
import {
  PILLARS,
  certifications,
  education,
  experience,
  extracurriculars,
  profile,
  projects,
  projectsByPillar,
  research,
  skills,
} from "@/content";
import type { Pillar } from "@/content/schema";

const PILLAR_LABELS: Record<Pillar, string> = {
  engineering: "Engineering",
  ai: "AI",
  "data-science": "Data Science",
  research: "Research",
  sustainability: "Sustainability",
};

// Public (reviewed) content only — this is serialised into the page.
const terminalData: TerminalData = {
  profile,
  education,
  experience,
  projects,
  research,
  skills,
  extracurriculars,
  certifications,
};

const intro = [
  ...runCommand("neofetch", { data: terminalData, history: [] }).lines,
  [],
  [
    { text: "type ", tone: "muted" as const },
    { text: "help", cmd: "help", tone: "accent" as const },
    { text: " or click a highlighted word. press ", tone: "muted" as const },
    { text: "/", tone: "accent" as const },
    { text: " to focus.", tone: "muted" as const },
  ],
];

export default function Home() {
  return (
    <>
      <HeroHeading />
      <p className="tagline">
        {profile.degree} · {profile.institution}
      </p>

      <Terminal data={terminalData} intro={intro} />

      <ResearchSection />

      <SqlSection data={terminalData} />

      <MlSection />

      <InfraSection />

      <section className="content-section" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Projects</h2>
        {PILLARS.filter((pillar) => pillar !== "research").map((pillar) => {
          const pillarProjects = projectsByPillar(pillar);
          if (pillarProjects.length === 0) {
            return null;
          }
          return (
            <div key={pillar}>
              <h3>{PILLAR_LABELS[pillar]}</h3>
              <ul>
                {pillarProjects.map((project) => (
                  <li key={project.slug}>
                    {project.links.repo ? (
                      <a href={project.links.repo}>{project.title}</a>
                    ) : (
                      project.title
                    )}
                    {project.links.live ? (
                      <>
                        {" "}
                        (<a href={project.links.live}>live</a>)
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="content-section" aria-labelledby="activities-heading">
        <h2 id="activities-heading">Leadership &amp; activities</h2>
        <ul>
          {extracurriculars.map((entry) => (
            <li key={entry.slug}>
              <span>{entry.role}</span> — <span>{entry.organisation}</span>
              {entry.links?.live ? (
                <>
                  {" "}
                  (<a href={entry.links.live}>live</a>)
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
