import { BootDismiss } from "./BootDismiss";

// Runs before first paint: skip the boot screen on repeat visits in this
// session and for automated browsers (tests, crawlers).
export const BOOT_INIT_SCRIPT = `try{if(sessionStorage.getItem("booted")||navigator.webdriver)document.documentElement.dataset.booted="1"}catch(e){}`;

const LINES: { text: string; status: "ok" | "wait" }[] = [
  { text: "mounting /dev/curiosity", status: "ok" },
  { text: "brewing chai for the night shift", status: "ok" },
  { text: "surveying 116 households (politely)", status: "ok" },
  { text: "drawing a face in 4,976 braille cells", status: "ok" },
  { text: "teaching sqlite some manners", status: "ok" },
  { text: "spinning up 2 ec2 instances (imaginary)", status: "ok" },
  { text: "calibrating vibes", status: "wait" },
];

/**
 * A boot screen over the page while the animated art loads, so the plain
 * static fallback never flashes. Typing and the progress bar are pure CSS;
 * BootDismiss lifts it (a CRT power-off) once the art is drawn.
 */
export function BootScreen() {
  return (
    <div className="boot" aria-hidden="true">
      <noscript>
        <style>{".boot{display:none!important}"}</style>
      </noscript>
      <div className="boot-inner">
        <p className="boot-title">
          shreyit-os <span className="boot-dim">v2026.11 · tty1</span>
        </p>
        <ol className="boot-log">
          {LINES.map((line, i) => (
            <li
              key={line.text}
              style={{ animationDelay: `${0.15 + i * 0.22}s` }}
              data-status={line.status}
            >
              <span className="boot-status">
                {line.status === "ok" ? "[ ok ]" : "[ .. ]"}
              </span>{" "}
              {line.text}
            </li>
          ))}
        </ol>
        <p className="boot-bar">
          <span className="boot-spin" />
          <span className="boot-track">
            <span className="boot-fill" />
          </span>
        </p>
        <p className="boot-hint">press any key to skip</p>
      </div>
      <BootDismiss />
    </div>
  );
}
