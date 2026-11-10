import { ActivityList } from "@/components/ActivityList";
import { HeroHeading } from "@/components/HeroHeading";
import { ProjectGrid } from "@/components/ProjectGrid";
import { HeroArt } from "@/components/hero/HeroArt";
import { InfraSection } from "@/components/infra/InfraSection";
import { MapSection } from "@/components/map/MapSection";
import { MlSection } from "@/components/ml/MlSection";
import { ResearchSection } from "@/components/research/ResearchSection";
import { SqlSection } from "@/components/sql/SqlSection";
import { Terminal } from "@/components/terminal/Terminal";
import { runCommand } from "@/components/terminal/commands";
import type { TerminalData } from "@/components/terminal/types";
import {
  certifications,
  education,
  experience,
  extracurriculars,
  profile,
  projects,
  research,
  skills,
} from "@/content";

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
      <HeroArt />
      <HeroHeading />
      <p className="tagline">
        {profile.degree} · {profile.institution}
      </p>

      <Terminal data={terminalData} intro={intro} />

      <ResearchSection />

      <MapSection />

      <SqlSection data={terminalData} />

      <MlSection />

      <InfraSection />

      <section className="content-section" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Projects</h2>
        <ProjectGrid projects={projects} />
      </section>

      <section className="content-section" aria-labelledby="activities-heading">
        <h2 id="activities-heading">Leadership &amp; activities</h2>
        <ActivityList entries={extracurriculars} />
      </section>
    </>
  );
}
