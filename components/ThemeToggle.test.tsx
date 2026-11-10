import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = "dark";
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.theme;
    localStorage.clear();
  });

  it("has a fixed accessible name and flips data-theme when clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: "light theme" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("[ ] light theme");
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("[x] light theme");

    await user.click(button);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("shows pressed when the document starts in light theme", () => {
    document.documentElement.dataset.theme = "light";
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("persists the choice to localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "light theme" }));
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
