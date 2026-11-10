# portfolio-ascii-shreyit

Personal portfolio of Shreyit Sinha — ASCII-inspired, built with Next.js (App Router) and TypeScript.

## Stack

- **Next.js** (latest stable, App Router) + **React** + **TypeScript** (`strict` + `noUncheckedIndexedAccess`)
- **GSAP** (`@gsap/react`, `gsap/ScrollTrigger`) for animation, **Lenis** for smooth scrolling
- Plain CSS design tokens in `app/globals.css` (no Tailwind) — dark theme by default, light via `data-theme="light"` or `prefers-color-scheme`
- **Vitest** + Testing Library for unit tests, **Playwright** for e2e
- **ESLint** (flat config, `eslint-config-next` + `eslint-config-prettier`) and **Prettier**

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Start dev server                     |
| `pnpm build`        | Production build                     |
| `pnpm start`        | Serve the production build           |
| `pnpm lint`         | ESLint                               |
| `pnpm typecheck`    | `tsc --noEmit`                       |
| `pnpm format`       | Prettier write                       |
| `pnpm format:check` | Prettier check                       |
| `pnpm test`         | Vitest unit tests                    |
| `pnpm test:e2e`     | Playwright e2e (builds + starts app) |

## Content layer

`content/` is the single source of truth for everything the site renders — typed,
zod-validated, frozen at module load (`content/index.ts` throws on invalid data).

- `content/resume.ts` — profile, education, experience, certifications, extracurriculars (transcribed from the resume PDF; corrections are commented inline)
- `content/projects.ts` / `content/research.ts` / `content/skills.ts` — projects, first-class research & fieldwork entries, skills (categories match the resume headings)
- `content/generated/github.json` — committed data written by `pnpm sync:github` (PR-safe, no timestamps). The site build never calls GitHub.
- `content/allowlist.json` — the ONLY repositories the site may reference. Anything referencing a repo outside this list fails validation, and the same allowlist gates what `sync:github` will write. Repos not on the resume appear with `needsReview: true` and no invented details (unknown periods are `null`).
- Blank/unknown facts are always `null` with `needsReview: true` — never invented. Data is server-only for now (no `server-only` dependency; comment-marked in `content/index.ts`).

### Syncing GitHub metadata

```
pnpm sync:github
```

Reads the allowlist, fetches each repo (`/repos/Shreyit/<name>`, `/languages`, `/topics`)
using `GITHUB_TOKEN` or `gh auth token`. If any repo is private, archived or missing the
script writes nothing and exits 1. Re-runs are stable: output is sorted and has no
timestamps, so an unchanged profile produces no diff.

## Structure

```
app/                  # App Router root: layout.tsx, page.tsx, globals.css
components/           # UI components (HeroHeading, ThemeToggle) + unit tests
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
