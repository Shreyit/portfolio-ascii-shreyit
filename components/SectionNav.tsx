import styles from "./SectionNav.module.css";

const SECTIONS = [
  { id: "research-heading", label: "research" },
  { id: "map-heading", label: "map" },
  { id: "sql-heading", label: "sql" },
  { id: "ml-heading", label: "ml" },
  { id: "infra-heading", label: "infra" },
  { id: "skills-heading", label: "skills" },
  { id: "projects-heading", label: "projects" },
  { id: "contact", label: "contact" },
] as const;

export function SectionNav() {
  return (
    <nav className={styles.nav} aria-label="Sections">
      {SECTIONS.map(({ id, label }) => (
        <a key={id} href={`#${id}`} className={styles.link} aria-label={label}>
          {label}
        </a>
      ))}
    </nav>
  );
}
