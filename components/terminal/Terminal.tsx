"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Line, TerminalData } from "./types";

type CommandsModule = typeof import("./commands");

interface Entry {
  id: number;
  input?: string;
  lines: Line[];
}

interface TerminalProps {
  data: TerminalData;
  /** Server-rendered opening output (e.g. neofetch), shown before any JS. */
  intro: Line[];
  prompt?: string;
}

const MAX_ENTRIES = 200;

// The command set is loaded on first interaction, keeping it off the
// critical path; the intro transcript is already server-rendered.
let commandsPromise: Promise<CommandsModule> | null = null;
function loadCommands(): Promise<CommandsModule> {
  commandsPromise ??= import("./commands");
  return commandsPromise;
}

export function Terminal({
  data,
  intro,
  prompt = "visitor@shreyit:~$",
}: TerminalProps) {
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, lines: intro }]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);
  const historyIndex = useRef<number | null>(null);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const append = useCallback((entry: Omit<Entry, "id">) => {
    const id = nextId.current;
    nextId.current += 1;
    setEntries((current) => [...current, { id, ...entry }].slice(-MAX_ENTRIES));
  }, []);

  const run = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      setInput("");
      setCandidates([]);
      historyIndex.current = null;
      const nextHistory = trimmed ? [...history, trimmed] : history;
      if (trimmed) setHistory(nextHistory);

      const { runCommand } = await loadCommands();
      const result = runCommand(trimmed, {
        data,
        history: nextHistory,
      });
      if (result.clear) {
        setEntries([]);
        return;
      }
      append({ input: trimmed, lines: result.lines });
    },
    [append, data, history],
  );

  // Keep the newest output in view (inside the log only, not the page).
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries, candidates]);

  // "/" focuses the terminal from anywhere, unless the user is typing.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recall = (direction: -1 | 1) => {
    if (!history.length) return;
    const current = historyIndex.current ?? history.length;
    const next = Math.min(history.length, Math.max(0, current + direction));
    historyIndex.current = next;
    setInput(history[next] ?? "");
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void run(input);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      recall(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      recall(1);
    } else if (event.key === "Tab" && input.trim()) {
      // Only capture Tab when there is something to complete, so keyboard
      // users can still tab out of an empty prompt.
      event.preventDefault();
      const { complete } = await loadCommands();
      const result = complete(input, data);
      setInput(result.value);
      setCandidates(result.candidates);
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setEntries([]);
    } else if (
      event.key === "c" &&
      event.ctrlKey &&
      !window.getSelection()?.toString()
    ) {
      event.preventDefault();
      append({ input: `${input}^C`, lines: [] });
      setInput("");
    }
  };

  return (
    <section className="terminal" aria-label="Interactive terminal">
      <div className="terminal-bar" aria-hidden="true">
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-dot" />
        <span className="terminal-title">~/shreyit — zsh</span>
      </div>
      <div
        ref={logRef}
        className="terminal-body"
        data-scroll-pane
        onPointerEnter={() => void loadCommands()}
        onClick={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus();
        }}
      >
        <div role="log" aria-live="polite" aria-relevant="additions">
          {entries.map((entry) => (
            <div key={entry.id} className="terminal-entry">
              {entry.input !== undefined && (
                <div className="terminal-line">
                  <span className="t-prompt">{prompt}</span> {entry.input}
                </div>
              )}
              <Lines lines={entry.lines} onRun={run} />
            </div>
          ))}
          {candidates.length > 0 && (
            <div className="terminal-line t-muted">{candidates.join("  ")}</div>
          )}
        </div>
        <div className="terminal-input-row">
          <label htmlFor={inputId} className="t-prompt">
            {prompt}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="terminal-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setCandidates([]);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => void loadCommands()}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-describedby={`${inputId}-hint`}
          />
        </div>
        <p id={`${inputId}-hint`} className="visually-hidden">
          Type a command and press Enter. Type help to list commands. Press
          slash anywhere on the page to focus this prompt.
        </p>
      </div>
    </section>
  );
}

function Lines({
  lines,
  onRun,
}: {
  lines: Line[];
  onRun: (command: string) => void;
}) {
  return lines.map((line, i) => {
    const isBullet = line[0]?.text === "  - ";
    return (
      <div
        key={i}
        className={
          isBullet ? "terminal-line terminal-line--bullet" : "terminal-line"
        }
      >
        {line.length === 0
          ? " "
          : line.map((segment, j) => {
              const className = segment.tone ? `t-${segment.tone}` : undefined;
              if (segment.href) {
                const samePage = segment.href.startsWith("#");
                return (
                  <a
                    key={j}
                    className="t-link"
                    href={segment.href}
                    {...(samePage
                      ? {}
                      : { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {segment.text}
                  </a>
                );
              }
              if (segment.cmd) {
                const command = segment.cmd;
                return (
                  <button
                    key={j}
                    type="button"
                    className="t-cmd"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRun(command);
                    }}
                  >
                    {segment.text}
                  </button>
                );
              }
              return (
                <span key={j} className={className}>
                  {segment.text}
                </span>
              );
            })}
      </div>
    );
  });
}
