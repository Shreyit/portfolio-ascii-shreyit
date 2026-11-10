import type { ReactNode } from "react";
import styles from "./LabPanel.module.css";

interface LabPanelProps {
  /** The heading id (e.g. "sql-heading"). */
  id: string;
  /** Visible title (e.g. "SQL playground"). */
  title: string;
  /** Fake path shown in the title bar (e.g. "~/labs/portfolio.sqlite"). */
  command: string;
  intro: ReactNode;
  children: ReactNode;
}

export function LabPanel({
  id,
  title,
  command,
  intro,
  children,
}: LabPanelProps) {
  return (
    <section className={`lab-section ${styles.panel}`} aria-labelledby={id}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.command}>{command}</span>
      </div>
      <div className={styles.body}>
        <h2 id={id}>{title}</h2>
        <div className={styles.intro}>{intro}</div>
        {children}
      </div>
    </section>
  );
}
