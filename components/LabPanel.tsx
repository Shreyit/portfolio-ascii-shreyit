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
  /** Optional links shown at the right of the title bar. */
  actions?: ReactNode;
}

export function LabPanel({
  id,
  title,
  command,
  intro,
  children,
  actions,
}: LabPanelProps) {
  return (
    <section
      className={`lab-section spot ${styles.panel}`}
      aria-labelledby={id}
    >
      <div className={styles.bar}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.command} aria-hidden="true">
          {command}
        </span>
        {actions}
      </div>
      <div className={styles.body}>
        <h2 id={id}>{title}</h2>
        <div className={styles.intro}>{intro}</div>
        {children}
      </div>
    </section>
  );
}
