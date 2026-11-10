import type {
  Certification,
  Education,
  Experience,
  Extracurricular,
  Profile,
  Project,
  ResearchEntry,
  Skill,
} from "@/content/schema";

export type Tone = "default" | "muted" | "accent" | "error";

/** One styled run of text. `href` renders a link, `cmd` a runnable command. */
export interface Segment {
  text: string;
  tone?: Tone;
  href?: string;
  cmd?: string;
}

export type Line = Segment[];

/** Public (reviewed) content only — this is serialised to the client. */
export interface TerminalData {
  profile: Profile;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  research: ResearchEntry[];
  skills: Skill[];
  extracurriculars: Extracurricular[];
  certifications: Certification[];
}

export interface CommandContext {
  data: TerminalData;
  history: readonly string[];
}

export interface CommandResult {
  lines: Line[];
  /** Clear the scrollback before printing `lines`. */
  clear?: boolean;
}
