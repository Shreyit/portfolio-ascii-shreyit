import { HeroHeading } from "@/components/HeroHeading";
import {
  PILLARS,
  extracurriculars,
  projectsByPillar,
  research,
} from "@/content";
import type { Pillar } from "@/content/schema";

const PILLAR_LABELS: Record<Pillar, string> = {
  engineering: "Engineering",
  ai: "AI",
  "data-science": "Data Science",
  research: "Research",
  sustainability: "Sustainability",
};

export default function Home() {
  return (
    <>
      <HeroHeading />
      {/* Placeholder tagline — to be replaced with real content later */}
      <p className="tagline" data-placeholder="true">
        portfolio — under construction
      </p>

      <section aria-labelledby="projects-heading">
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

      <section aria-labelledby="research-heading">
        <h2 id="research-heading">Research &amp; fieldwork</h2>
        <ul>
          {research.map((entry) => (
            <li key={entry.slug}>{entry.title}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="activities-heading">
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
