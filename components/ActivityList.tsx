import type { Extracurricular } from "@/content/schema";
import styles from "./ActivityList.module.css";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function month(value: string): string {
  const [year, m] = value.split("-");
  const name = MONTHS[Number(m) - 1];
  return name ? `${name} ${year}` : value;
}

export function formatPeriod(period: {
  start: string | null;
  end: string | null;
}): string {
  const { start, end } = period;
  if (!start && !end) return "";
  if (start && !end) return `${month(start)} - present`;
  if (!start && end) return month(end);
  if (start === end) return month(start!);
  return `${month(start!)} - ${month(end!)}`;
}

export function ActivityList({ entries }: { entries: Extracurricular[] }) {
  return (
    <ul role="list" className={styles.grid}>
      {entries.map((entry) => (
        <li key={entry.slug} className={styles.item} data-reveal>
          <article className={`spot ${styles.card}`}>
            <h3 className={styles.role}>{entry.role}</h3>
            <p className={styles.organisation}>{entry.organisation}</p>
            <p className={styles.period}>{formatPeriod(entry.period)}</p>
            {entry.details[0] ? (
              <p className={styles.detail}>{entry.details[0]}</p>
            ) : null}
            {entry.links?.live ? (
              <a className={styles.link} href={entry.links.live}>
                visit -&gt;
              </a>
            ) : null}
          </article>
        </li>
      ))}
    </ul>
  );
}
