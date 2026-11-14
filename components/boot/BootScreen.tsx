import { BootDismiss } from "./BootDismiss";

// Runs before first paint: skip the boot screen on repeat visits in this
// session and for automated browsers (tests, crawlers).
export const BOOT_INIT_SCRIPT = `try{if(sessionStorage.getItem("booted")||navigator.webdriver)document.documentElement.dataset.booted="1"}catch(e){}`;

// Short lines: they type onto the handheld's small screen.
const LINES: { text: string; status: "ok" | "wait" }[] = [
  { text: "mounting /dev/curiosity", status: "ok" },
  { text: "brewing chai", status: "ok" },
  { text: "surveying 116 households", status: "ok" },
  { text: "drawing a face in ascii", status: "ok" },
  { text: "teaching sqlite manners", status: "ok" },
  { text: "spinning up ec2 (imaginary)", status: "ok" },
  { text: "calibrating vibes", status: "wait" },
];

/**
 * A boot screen over the page while the animated art loads, so the plain
 * static fallback never flashes: the skills section's handheld powers on and
 * the boot log types across its screen. Decorative only (no real controls);
 * typing and the progress bar are pure CSS. BootDismiss lifts it (a CRT
 * power-off) once the art is drawn.
 */
export function BootScreen() {
  return (
    <div className="boot" aria-hidden="true">
      <noscript>
        <style>{".boot{display:none!important}"}</style>
      </noscript>
      <div className="boot-inner">
        <div className="console-body boot-console">
          <div className="console-bezel">
            <p className="console-bezel-label">
              <span className="console-led" /> PX-7 · booting
            </p>
            <div className="console-screen">
              <div className="boot-screen">
                <p className="boot-title">
                  shreyit-os <span className="boot-dim">v2026.11</span>
                </p>
                <ol className="boot-log">
                  {LINES.map((line, i) => (
                    <li
                      key={line.text}
                      style={{ animationDelay: `${0.45 + i * 0.2}s` }}
                      data-status={line.status}
                    >
                      <span className="boot-status">
                        {line.status === "ok" ? "[ok]" : "[..]"}
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
              </div>
            </div>
          </div>
          <p className="console-brand">
            shreyit<span>pocket</span>
          </p>
          <div className="console-controls">
            <div className="console-dpad">
              <span className="dpad-up" />
              <span className="dpad-left" />
              <span className="dpad-center" />
              <span className="dpad-right" />
              <span className="dpad-down" />
            </div>
            <div className="console-ab">
              <span className="console-ab-b">
                <span className="console-round" />B
              </span>
              <span className="console-ab-a">
                <span className="console-round" />A
              </span>
            </div>
          </div>
          <div className="console-meta">
            <span className="console-pill-wrap">
              <span className="console-pill" />
              select
            </span>
            <span className="console-pill-wrap">
              <span className="console-pill" />
              start
            </span>
            <span className="console-grille" />
          </div>
        </div>
        <p className="boot-hint">press any key to skip</p>
      </div>
      <BootDismiss />
    </div>
  );
}
