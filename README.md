# portfolio-ascii-shreyit

Personal portfolio of Shreyit Sinha — ASCII-inspired, built with Next.js (App Router) and TypeScript.

## Stack

- **Next.js** (latest stable, App Router) + **React** + **TypeScript** (`strict` + `noUncheckedIndexedAccess`)
- **GSAP** (`@gsap/react`, `gsap/ScrollTrigger`) for animation, **Lenis** for smooth scrolling
- Plain CSS design tokens in `app/globals.css` (no Tailwind) — dark-only design
- **Vitest** + Testing Library for unit tests, **Playwright** for e2e
- **ESLint** (flat config, `eslint-config-next` + `eslint-config-prettier`) and **Prettier**

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Start dev server                        |
| `pnpm build`        | Production build                        |
| `pnpm start`        | Serve the production build              |
| `pnpm lint`         | ESLint                                  |
| `pnpm typecheck`    | `tsc --noEmit`                          |
| `pnpm format`       | Prettier write                          |
| `pnpm format:check` | Prettier check                          |
| `pnpm test`         | Vitest unit tests                       |
| `pnpm test:e2e`     | Playwright e2e (builds + starts app)    |
| `pnpm sync:github`  | Refresh `content/generated/github.json` |

## Content layer

`content/` is the single source of truth for everything the site renders — typed,
zod-validated, frozen at module load (`content/index.ts` throws on invalid data).

- `content/resume.ts` — profile, education, experience, certifications, extracurriculars (transcribed from the resume PDF; corrections are commented inline)
- `content/projects.ts` / `content/research.ts` / `content/skills.ts` — projects, first-class research & fieldwork entries, skills (categories match the resume headings)
- `content/generated/github.json` — committed data written by `pnpm sync:github` (PR-safe, no timestamps). The site build never calls GitHub.
- `content/allowlist.json` — the ONLY repositories the site may reference. Anything referencing a repo outside this list fails validation, and the same allowlist gates what `sync:github` will write. Repos not on the resume appear with `needsReview: true` and no invented details (unknown periods are `null`).
- Blank/unknown facts are always `null` with `needsReview: true` — never invented. The layer is server-only (`import "server-only"` in `content/index.ts`; vitest aliases it to an empty module). Only entries with `needsReview: false` render on public pages.

### Syncing GitHub metadata

```
pnpm sync:github
```

Reads the allowlist, fetches each repo (`/repos/Shreyit/<name>`, `/languages`, `/topics`)
using `GITHUB_TOKEN` or `gh auth token`. If any repo is private, archived or missing the
script writes nothing and exits 1. Re-runs are stable: output is sorted and has no
timestamps, so an unchanged profile produces no diff.

## ASCII engine

`components/ascii/engine/` is a small, framework-free renderer shared by every
ASCII experience on the site. It has no React imports (enforced by a purity test).

- `grid.ts` — `AsciiGrid`: columns x rows of character codes (`Uint16Array`) with a palette index per cell, a dirty bitmap (`set()` is a no-op when unchanged; out-of-bounds ignored), `writeText`/`fill`/`clear`/`resize`, and `toPlainText()` for server-rendered fallbacks.
- `ramps.ts` — named density ramps (`standard`, `blocks`, `fine`) and `rampChar(ramp, value01)`, clamped to [0, 1].
- `metrics.ts` — `measureFont(fontFamily)`: font metrics as ratios of the font size, measured once per family on a 100 px probe canvas (after `document.fonts.load`), cached. Measures tall EXTREME_GLYPHS (not just "M") so glyphs are never clipped.
- `layout.ts` — `computeLayout(cssWidth, cssHeight, ...)`: fits a cols x rows grid exactly into a CSS box (cell size may be fractional; per-edge device-pixel snapping via `cellSpan`). Font size derives from the cell width, shrunk if the tallest glyph extents don't fit the cell height. `null` when the box is degenerate.
- `glyph-atlas.ts` — pre-rendered (char, color) glyphs. Atlases are **shared and reference-counted** (`acquireAtlas`/`release`) — instances with the same font size, cell size and palette draw from one small surface that **grows on demand** up to 2048x2048. Falls back to plain `fillText` when full.
- `palette.ts` — reads `--fg/--muted/--accent/--border/--bg` (index 0-3 = fg/muted/accent/border; bg used for clearing) plus `onThemeChange(cb)` (kept; dark-only today).
- `renderer.ts` — `CanvasRenderer`: draws only dirty cells; a full redraw happens on resize, DPR change (uncapped `resolution: dppx` media query). `stats` exposes `frames`, `cellsDrawn`, `lastFrameMs`. `destroy()` releases the atlas reference and observers.
- `scheduler.ts` — the only ASCII animation loop, on the shared `gsap.ticker` from `lib/motion/gsap-setup.ts` (no second rAF loop). One ticker callback is added while ≥1 job is active and removed when the last is disposed. Per-job `fps` throttle (default 30), `dtMs` clamped to 100 ms, per-job error isolation (`console.error` at most once per job), `resume()` resets the clock, and everything pauses while `document.hidden`.
- `scene.ts` — the scene contract: `init(grid)`, `update(grid, timeMs, dtMs)`, `staticFrame(grid)` (single representative frame; used for reduced motion and SSR).

The `AsciiCanvas` wrapper (`components/ascii/AsciiCanvas.tsx`) is a client component
that renders an accessible `<figure role="img">`: a server-rendered, static `<pre>`
frame (plain grid — works with no JS) overlaid by a `<canvas>` once the first frame is
drawn. It reserves space with `aspect-ratio` (monospace cell ratio) plus `minFontPx`
(default 6) — below that, `.ascii-scroll` scrolls instead of shrinking further — so
there is no layout shift on the `<pre>` → canvas swap. With reduced motion it keeps
the `<pre>` and never creates a renderer; off-screen figures are paused via
IntersectionObserver (rootMargin `100px`) and resume when visible. Setting
`?asciiStats` (or a non-production build) exposes per-instance stats on
`window.__asciiStats`.

`/lab/ascii` is the engine test page (`robots: noindex, nofollow`, not linked anywhere):
a 160x60 plasma-field instance inside `.ascii-scroll` with `data-lenis-prevent`, a tall
spacer, and a second 40x12 instance below the fold for off-screen behavior.

## Terminal

`components/terminal/` is an interactive, keyboard-driven terminal that reads the
same public (reviewed) content as the rest of the site — nothing more is serialised
to the client than `TerminalData` (full content minus `needsReview` entries).

- `types.ts` — `Segment` (text + tone/href/cmd), `Line`, `Tone`, and `TerminalData`
  (profile, education, experience, projects, research, skills, extracurriculars,
  certifications). Commands receive a `CommandContext` (data, history).
- `parser.ts` — `tokenize()`: whitespace splitting with single/double quotes
  (an unterminated quote runs to end of line).
- `commands.ts` — pure command handlers over the data snapshot (no I/O). Visible
  commands (`COMMANDS`): `help`, `whoami`, `neofetch`, `ls`, `cat`, `open`, `skills`,
  `stack`, `grep`, `experience`, `fieldwork`, `sql`, `ml`, `infra`, `explore`,
  `contact`, `history`, `clear` (alias `cls`). Hidden easter eggs: `sudo`,
  `sudo`, `vim`, `:q`, `rm`. Also `runCommand`, `complete` (tab completion) and
  `formatPeriod`.
- `commands.test.ts` — vitest coverage: tokenizer, `formatPeriod`, `help` output,
  `ls`/`cat`/`grep`/`stack` resolution (including ambiguity), tab
  completion, and privacy: command output is scanned to guarantee no unreviewed or
  private repository names (`brsr_tool`, `cdp_analysis`, `DataCo-Market-Dashboard`,
  `SDG-Streamlit-Interactive-Dashboard`, `my-neovim-ds-config`, SANKHYA paths) ever
  appear, and `open` only exposes public links.
- `Terminal.tsx` — client component. The opening transcript (server-rendered
  `neofetch`) is shown before any JS loads; the command module
  (`import("./commands")`) is dynamically imported on first interaction (hover,
  focus or Tab) to keep it off the critical path. Features: tab completion with a
  candidates line, command history (ArrowUp/ArrowDown), `/` focuses the prompt from
  anywhere (unless you are already typing in an input), Ctrl+L clears, Ctrl+C
  cancels the current line, `role="log"` + `aria-live="polite"`, max 200 entries,
  auto-scrolls the log only (never the page). Lines whose first segment is the
  bullet marker `"  - "` get `.terminal-line--bullet` (hanging indent).

## SQL playground

`components/sql/` runs SQLite (via sql.js / WebAssembly) in a Web Worker, so a
runaway query (e.g. an infinite recursive CTE) can be terminated by the page after
a 3-second timeout — the client then boots a fresh database from the seed instead of
freezing. The wasm binary is served from our own origin: `scripts/copy-sqljs.mjs`
copies `sql.js/dist/sql-wasm-browser.wasm` to `public/vendor/` on `postinstall`
(`public/vendor/` is gitignored). Tables are seeded **only from public (reviewed)
content** — `seed(data: TerminalData)` in `components/sql/schema.ts` — never from the
private Safewater Lines data or resume contact details. `SqlIsland.tsx`
is a lazily-loaded island (shared `useLoadWhenVisible` hook — loads at 15% visibility
or on pointer/focus) that swaps in the interactive playground over the server-rendered
static view; the query log caps rows at 200 (`MAX_ROWS`).

## ML laboratory

`components/ml/` recreates the Rinn microcredit study interactively. All numbers come
from `content/rinn-lab.ts`, transcribed verbatim from the saved outputs of
`notebooks/01_section_III_submission.ipynb` in the public repo
`github.com/Shreyit/rinn-microcredit-risk` (cell numbers are noted in the file);
nothing is re-computed or estimated. The data are synthetic (seeded generator), as the
repo states, and per-loan probabilities were never saved — which is why the lab offers
only the thresholds the study actually evaluated (0.5 and 0.3) instead of a continuous
threshold slider. `ml.test.ts` asserts that every model's metrics are consistent with
its confusion matrix and that the threshold results match the resume's claim. The lab
is a lazily-loaded island with a server-rendered static view, ASCII sweep chart, and
tabs for the model arena / decision threshold / fit view.

## Infrastructure simulator

`components/infra/` is an interactive, real-time model of the pattern from the AI
DataCraftTech internship: FastAPI on EC2 instances in an Auto Scaling group behind an
Application Load Balancer, static assets on S3/CloudFront, and rolling releases.

- `sim.ts` — a pure simulation model (`createSim`, `step`, `deploy`, `spike`,
  `killInstance`, `setTraffic`, ...) parameterized by `PARAMS` (capacity per instance,
  target CPU, min/max instances, boot/drain/detect seconds, cooldowns, spike shape,
  base latency). Numbers are teaching values, explicitly **not** production measurements.
- `scene.ts` — an ASCII scene on the engine (`COLS`x`ROWS`): boxes for users/CDN/ALB,
  instance slots with junctions derived from connection routing (shared trunks get
  proper ├ ┤ ┬ characters) and stable display slots (lowest free at launch).
  `infraText()` renders the same state as plain text for the reduced-motion view.
- `InfraLab.tsx` — steps the model in real time only while the lab is on screen and the
  tab is visible; reduced-motion users get the plain-text view instead.
- `InfraPanel.tsx` — live stats + an `aria-live="polite"` event log.

## Research & fieldwork explorer

`components/research/` presents the Nainital and Sangamner fieldwork as interactive
explorations. Its data lives in `content/research-lab.ts` and is restricted to
**already-published, aggregated results**: the Nainital Tourism Vulnerability Dashboard
(public repo, team of 4 — role noted per block; resume responses/zones/pillar counts),
`Report.md` (contribution table and pillar table), and `Final_Pillar_Report.xlsx`
(sheet "Pillar Aggregate Scores"). **No row-level survey data is copied** — only group
means and respondent counts, with the unmeasured Workers × Environmental cell shown as
missing (no survey question was asked about it). Sources are cited per block in the file.

## Journey map

`components/map/` draws India in characters from the
[DataMeet India state boundaries](https://github.com/datameet/maps) shapefile
(CC BY 4.0, credited on the page). `scripts/build-india-map.mjs` parses the
`.shp`/`.dbf` directly, simplifies rings with Douglas-Peucker and writes
`content/generated/india-map.json` (~52 KB, loaded only with the map island).
The raw shapefile lives in gitignored `data/raw/`; the script header has the
download command. Places come from existing content (education, research,
experience) plus city-centre coordinates; flows are curved Bézier arcs with
travelling comets. Legend buttons are the accessible interface.

## Hero name

`scripts/build-name-mask.mjs` renders the name in a heavy face with headless
Chromium and samples per-cell ink coverage into
`content/generated/name-mask.json`. Edges are drawn with light glyphs, bodies
with dense cycling ones, coloured along the `--spectrum-*` palette.

## Testing

Unit tests (Vitest, `pnpm test`) cover the content layer (zod parse, allowlist, privacy
strings, slug uniqueness), the engine primitives (grid, ramps, scheduler, atlas, purity
— engine files must not reference React) and React components/hooks.

E2E tests (Playwright, `pnpm test:e2e`, builds + starts on :3100) cover the landing page
and `/lab/ascii`: first-load JS budget, hydration/console cleanliness,
system-preference following, reduced motion, off-screen pause, `<pre>` → canvas swap with
no layout shift, the 360px overflow rules, the canvas exactly filling its figure at 1280px and 360px,
and pixel-level ink checks on the ASCII canvas.

**First-load JS budget:** `e2e/budget.spec.ts` fails if the gzip size of all JS loaded by
`/` (or `/lab/ascii`) exceeds **170 KB**. The Next 16 + React 19 floor is ≈137 KB
(measured `react-dom` ≈72 KB and the Next client runtime ≈50 KB of it); gsap + lenis
add ≈28 KB; the remainder is headroom. Milestone content is server-rendered to stay
inside the budget.

## Privacy rules

- `content/allowlist.json` is the only list of repositories the site may reference;
  anything else in content fails validation (and `sync:github` won't write it either).
- `pnpm sync:github` refuses to write **anything** and exits 1 if any allowlisted repo is
  private, archived or missing.
- Every `needsReview: true` entry is hidden from public pages; they can only be promoted
  by explicit review.
- `Shreyit_Sinha_Resume.pdf` is gitignored (`/*.pdf`) and must never be committed; it is
  not copied into `public/` either.
- The resume phone number and the student email appear nowhere in `content/` (a test
  scans every file under `content/` for them).

## CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests, on
`ubuntu-latest`: checkout → pnpm (version from `package.json` `packageManager`) → Node 26
with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm typecheck` →
`pnpm format:check` → `pnpm test` → `playwright install --with-deps chromium` →
`CI=1 pnpm test:e2e` (which builds the app). Playwright report and `test-results/` are
uploaded as artifacts on failure. `sync:github` is deliberately not run in CI; no secrets
are used; `permissions: contents: read`; concurrency cancels in-progress runs for the same ref.

## Structure

```
app/                  # App Router root: layout.tsx, page.tsx, globals.css
components/           # UI components (HeroHeading, SectionNav, ContactLinks) + unit tests
components/ascii/     # ASCII engine (see above) + AsciiCanvas wrapper
components/terminal/  # Interactive terminal (see above)
components/sql/       # SQLite playground (sql.js worker; see above)
components/ml/        # ML laboratory (Rinn study; see above)
components/infra/     # Infrastructure simulator (see above)
components/research/  # Research & fieldwork explorer (see above)
content/              # Typed, validated content layer (see above)
lib/motion/           # Central animation lifecycle:
  gsap-setup.ts       #   registers ScrollTrigger once (client only)
  MotionProvider.tsx  #   single Lenis instance driven by gsap.ticker; useLenis() hook
  use-reduced-motion.ts # prefers-reduced-motion via useSyncExternalStore
e2e/                  # Playwright specs
```

Animation components should use `useGSAP()` from `@gsap/react` with a scope ref for
automatic cleanup, and skip animation entirely when `useReducedMotion()` is true.
Nested scroll panes that must keep native scrolling should add `data-lenis-prevent`
to the scrollable element.

## Deployment

The intended deployment target is **Vercel**, but the app must stay **host-portable** —
no Vercel-only APIs, no static-export-specific constraints. It should remain deployable
to AWS (e.g. via a Node server or container) without code changes.

## Note

`Shreyit_Sinha_Resume.pdf` in the repo root is source material and is intentionally not
published or copied into `public/`.
