// Presentational only (no hooks, no "use client"): rendered by the server as
// the static fallback, and by the lazily loaded SkillConsole with handlers.
import type { KeyboardEvent } from "react";
import type { Cart, ConsoleInput, ConsoleState } from "./carts";

export interface ConsoleViewProps extends ConsoleState {
  carts: readonly Cart[];
  onPress?: (input: ConsoleInput) => void;
  onInsert?: (cart: number) => void;
  onStart?: () => void;
  onSelect?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Whether sound is currently muted (sound defaults to on). */
  soundMuted?: boolean;
  onToggleSound?: () => void;
}

function PixelSpeaker({ muted }: { muted: boolean }) {
  return muted ? (
    <svg
      className="console-sound-glyph"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="6" width="2" height="4" fill="currentColor" />
      <rect x="4" y="5" width="1" height="6" fill="currentColor" />
      <rect x="5" y="4" width="1" height="8" fill="currentColor" />
      <rect x="6" y="3" width="1" height="10" fill="currentColor" />
      <rect x="10" y="7" width="1" height="2" fill="currentColor" />
      <rect x="12" y="5" width="1" height="6" fill="currentColor" />
    </svg>
  ) : (
    <svg
      className="console-sound-glyph"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="6" width="2" height="4" fill="currentColor" />
      <rect x="4" y="5" width="1" height="6" fill="currentColor" />
      <rect x="5" y="4" width="1" height="8" fill="currentColor" />
      <rect x="6" y="3" width="1" height="10" fill="currentColor" />
      <rect x="9" y="7" width="1" height="2" fill="currentColor" />
      <rect x="11" y="5" width="1" height="6" fill="currentColor" />
      <rect x="13" y="3" width="1" height="10" fill="currentColor" />
    </svg>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Rows that fit on the screen; the list scrolls to keep the cursor in view. */
const ROWS = 4;

export function ConsoleView(props: ConsoleViewProps) {
  const interactive = Boolean(props.onPress);
  const on = <T,>(handler: T): T | undefined =>
    interactive ? handler : undefined;
  const cart = props.carts[props.cart]!;
  const skill = cart.skills[props.cursor]!;
  const first = Math.max(
    0,
    Math.min(props.cursor - 1, cart.skills.length - ROWS),
  );
  const shown = cart.skills.slice(first, first + ROWS);
  const btn = (input: ConsoleInput, label: string, className: string) => (
    <button
      type="button"
      className={className}
      aria-label={label}
      disabled={!interactive}
      onClick={on(() => props.onPress?.(input))}
    />
  );

  return (
    <div className="console">
      <div
        className="console-body"
        role="group"
        aria-label="Skill console. Arrow keys move, Enter inspects, Escape goes back."
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={props.onKeyDown}
      >
        <div className="console-bezel">
          <p className="console-bezel-label" aria-hidden="true">
            <span className="console-led" /> PX-7 · skill system
          </p>
          <div className="console-screen" aria-live="polite">
            {/* Keyed by cart: the insert animation replays on every swap. */}
            <div className="console-screen-inner" key={props.cart}>
              <p className="console-hud">
                <span>
                  CART {pad(props.cart + 1)}/{pad(props.carts.length)}
                </span>
                <span aria-hidden="true">▮▮▮▯</span>
              </p>
              <p className="console-cart-title">{cart.title}</p>
              {props.inspecting ? (
                <div className="console-card">
                  <p className="console-card-name">{skill.name}</p>
                  <p className="console-card-label">found in</p>
                  <ul>
                    {skill.lab ? <li>► {skill.lab.name}</li> : null}
                    {skill.projects.map((p) => (
                      <li key={p}>► {p}</li>
                    ))}
                    {!skill.lab && skill.projects.length === 0 ? (
                      <li>► the resume, ready for the next project</li>
                    ) : null}
                  </ul>
                  <p className="console-hint">
                    {skill.lab ? "START: visit lab · " : ""}B: back
                  </p>
                </div>
              ) : (
                <>
                  <p className="console-more" aria-hidden="true">
                    {first > 0 ? "▲" : " "}
                  </p>
                  <ul className="console-list">
                    {shown.map((s, j) => {
                      const i = first + j;
                      return (
                        <li
                          key={s.name}
                          aria-current={i === props.cursor ? "true" : undefined}
                        >
                          <span aria-hidden="true">
                            {i === props.cursor ? "▶" : " "}
                          </span>{" "}
                          {s.name}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="console-more" aria-hidden="true">
                    {first + ROWS < cart.skills.length ? "▼" : " "}
                  </p>
                  <p className="console-hint" aria-hidden="true">
                    ◀▶ cart · ▲▼ pick · A info
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="console-brand" aria-hidden="true">
          shreyit<span>pocket</span>
        </p>

        <div className="console-controls">
          <div className="console-dpad">
            {btn("up", "Up: previous skill", "dpad-up")}
            {btn("left", "Left: previous cartridge", "dpad-left")}
            <span className="dpad-center" aria-hidden="true" />
            {btn("right", "Right: next cartridge", "dpad-right")}
            {btn("down", "Down: next skill", "dpad-down")}
          </div>
          <div className="console-ab">
            <span className="console-ab-b">
              {btn("b", "B: back", "console-round")}
              <span aria-hidden="true">B</span>
            </span>
            <span className="console-ab-a">
              {btn("a", "A: inspect skill", "console-round")}
              <span aria-hidden="true">A</span>
            </span>
          </div>
        </div>

        <div className="console-meta">
          <span className="console-pill-wrap">
            <button
              type="button"
              className="console-pill"
              aria-label="Select: random skill"
              disabled={!interactive}
              onClick={props.onSelect}
            />
            <span aria-hidden="true">select</span>
          </span>
          <span className="console-pill-wrap">
            <button
              type="button"
              className="console-pill"
              aria-label={
                skill.lab ? `Start: visit ${skill.lab.name}` : "Start"
              }
              disabled={!interactive || !skill.lab}
              onClick={props.onStart}
            />
            <span aria-hidden="true">start</span>
          </span>
          <span className="console-grille" aria-hidden="true" />
          <span className="console-pill-wrap console-sound-wrap">
            <button
              type="button"
              className="console-sound"
              aria-pressed={props.soundMuted ?? false}
              aria-label={props.soundMuted ? "Sound off" : "Sound on"}
              disabled={!props.onToggleSound}
              onClick={props.onToggleSound}
            >
              <PixelSpeaker muted={props.soundMuted ?? false} />
            </button>
            <span aria-hidden="true">sound</span>
          </span>
        </div>
      </div>

      <div className="console-rack">
        <p className="sql-label">the shelf · {props.carts.length} cartridges</p>
        <ul aria-label="Skill cartridges">
          {props.carts.map((c, i) => (
            <li key={c.title}>
              <button
                type="button"
                className="cart"
                aria-pressed={i === props.cart}
                disabled={!interactive}
                onClick={on(() => props.onInsert?.(i))}
              >
                <span className="cart-notch" aria-hidden="true" />
                <span className="cart-no" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <span className="cart-title">{c.title}</span>
                <span className="cart-count">{c.skills.length} skills</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
