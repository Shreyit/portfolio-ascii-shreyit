import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectGrid } from "./ProjectGrid";
import { ActivityList } from "./ActivityList";
import type { Project, Extracurricular } from "@/content/schema";

const baseProject: Project = {
  slug: "demo-project",
  title: "Demo Project",
  period: { start: "2026-01", end: "2026-01" },
  pillar: ["engineering", "ai"],
  summary: "A demo project.",
  highlights: [],
  stack: ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "extra"],
  links: { repo: null, live: null },
  github: null,
  featured: false,
  domain: null,
  needsReview: false,
  source: "resume",
};

afterEach(cleanup);

describe("ProjectGrid", () => {
  it("renders each project exactly once even with multiple pillars", () => {
    render(<ProjectGrid projects={[baseProject]} />);
    expect(screen.getAllByText("Demo Project")).toHaveLength(1);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("renders repo/live links only when set", () => {
    const noLinks = render(<ProjectGrid projects={[baseProject]} />);
    expect(noLinks.container.querySelector("a")).toBeNull();
    noLinks.unmount();

    const withRepo = render(
      <ProjectGrid
        projects={[
          {
            ...baseProject,
            links: { repo: "https://github.com/Shreyit/demo", live: null },
          },
        ]}
      />,
    );
    expect(withRepo.getByRole("link", { name: "repo ->" })).toHaveAttribute(
      "href",
      "https://github.com/Shreyit/demo",
    );
    expect(withRepo.queryByRole("link", { name: "live ->" })).toBeNull();
    withRepo.unmount();

    const withBoth = render(
      <ProjectGrid
        projects={[
          {
            ...baseProject,
            links: {
              repo: "https://github.com/Shreyit/demo",
              live: "https://demo.vercel.app",
            },
          },
        ]}
      />,
    );
    expect(withBoth.getByRole("link", { name: "live ->" })).toHaveAttribute(
      "href",
      "https://demo.vercel.app",
    );
  });

  it("shows at most five stack items", () => {
    render(<ProjectGrid projects={[baseProject]} />);
    expect(screen.getByText(/AWS/)).toBeInTheDocument();
    expect(screen.queryByText(/extra/)).toBeNull();
  });
});

describe("ActivityList", () => {
  const entry: Extracurricular = {
    slug: "demo-activity",
    role: "Convenor",
    organisation: "Demo Fest",
    period: { start: "2024-12", end: null },
    projectSlug: null,
    details: ["Did the thing."],
    links: { live: "https://demo.example.com" },
  };

  it("renders the visit link and a formatted ongoing period", () => {
    render(<ActivityList entries={[entry]} />);
    expect(screen.getByRole("link", { name: "visit ->" })).toHaveAttribute(
      "href",
      "https://demo.example.com",
    );
    expect(screen.getByText("Dec 2024 - present")).toBeInTheDocument();
  });

  it("formats a bounded period as 'Mar 2026' for a single month and a range otherwise", () => {
    const same = render(
      <ActivityList
        entries={[
          {
            ...entry,
            slug: "same-month",
            period: { start: "2026-03", end: "2026-03" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Mar 2026")).toBeInTheDocument();
    same.unmount();

    render(
      <ActivityList
        entries={[
          {
            ...entry,
            slug: "range",
            period: { start: "2026-03", end: "2026-05" },
          },
        ]}
      />,
    );
    expect(screen.getByText("Mar 2026 - May 2026")).toBeInTheDocument();
  });

  it("omits the visit link when none is set", () => {
    render(
      <ActivityList
        entries={[{ ...entry, slug: "no-link", links: undefined }]}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });
});
