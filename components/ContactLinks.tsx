import { profile } from "@/content";
import styles from "./ContactLinks.module.css";

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, "");

export function ContactLinks() {
  const { github, linkedin, email, collegeEmail } = profile.links;

  const entries = [
    email
      ? {
          label: "email",
          text: email,
          href: `mailto:${email}`,
          external: false,
        }
      : null,
    linkedin
      ? {
          label: "linkedin",
          text: stripProtocol(linkedin),
          href: linkedin,
          external: true,
        }
      : null,
    github
      ? {
          label: "github",
          text: stripProtocol(github),
          href: github,
          external: true,
        }
      : null,
    collegeEmail
      ? {
          label: "college",
          text: collegeEmail,
          href: `mailto:${collegeEmail}`,
          external: false,
        }
      : null,
  ].filter((entry) => entry !== null);

  return (
    <section
      id="contact"
      className={styles.contact}
      aria-labelledby="contact-heading"
    >
      <h2 id="contact-heading" className={styles.heading}>
        contact
      </h2>
      <ul className={styles.list}>
        {entries.map(({ label, text, href, external }) => (
          <li key={label} className={styles.item}>
            <span className={styles.label}>{label}</span>
            <a
              className={styles.link}
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
