import type { Project, Pillar } from "@/content/schema";
import styles from "./ProjectGrid.module.css";

const PILLAR_LABELS: Record<Pillar, string> = {
  engineering: "Engineering",
  ai: "AI",
  "data-science": "Data Science",
  research: "Research",
  sustainability: "Sustainability",
};

export function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <ul role="list" className={styles.grid}>
      {projects.map((project, index) => (
        <li key={project.slug} className={styles.item} data-reveal>
          <article className={`spot ${styles.card}`}>
            <div className={styles.topRow}>
              <span className={styles.index}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.chips}>
                {project.pillar.map((pillar) => (
                  <span key={pillar} className={styles.chip}>
                    {PILLAR_LABELS[pillar]}
                  </span>
                ))}
              </span>
            </div>
            <h3 className={styles.title}>{project.title}</h3>
            {project.summary ? (
              <p className={styles.summary}>{project.summary}</p>
            ) : null}
            {project.stack.length > 0 ? (
              <p className={styles.stack}>
                {project.stack.slice(0, 5).join("  ·  ")}
              </p>
            ) : null}
            {project.links.repo || project.links.live ? (
              <div className={styles.footer}>
                {project.links.repo ? (
                  <a className={styles.link} href={project.links.repo}>
                    repo -&gt;
                  </a>
                ) : null}
                {project.links.live ? (
                  <a className={styles.link} href={project.links.live}>
                    live -&gt;
                  </a>
                ) : null}
              </div>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
