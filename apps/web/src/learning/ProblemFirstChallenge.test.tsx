import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProblemFirstChallenge } from "./ProblemFirstChallenge.js";

const props = {
  eyebrow: "Worked cycle",
  problemStageLabel: "Problem",
  title: "Tiny challenge",
  description: "Try the problem.",
  constraintsLabel: "Constraints",
  constraints: "n ≤ 5",
  sampleLabel: "Sample",
  sample: "1 2 3",
  sourceUrl: "https://example.com/problem",
  sourceLabel: "Open problem",
  attemptPrompt: "Pause before revealing.",
  attemptStageLabel: "Your turn",
  revealLabel: "Show the tool",
  hideLabel: "Hide the tool",
  toolTitle: "Generate candidates",
  applicationPrompt: "Now apply it.",
  applicationRevealLabel: "Show application",
  applicationHideLabel: "Hide application",
  applicationTitle: "Apply candidates",
  toolStageLabel: "Tool",
  applicationStageLabel: "Apply",
  application: <p>Application body</p>
} as const;

describe("problem-first interactions", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reveals the general tool and application in separate focused stages, then resets on remount", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const { unmount } = render(<ProblemFirstChallenge {...props}><p>Technique body</p></ProblemFirstChallenge>);

    expect(screen.queryByRole("heading", { name: "Generate candidates" })).not.toBeInTheDocument();
    const reveal = screen.getByRole("button", { name: "Show the tool" });
    expect(reveal).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(reveal);
    const heading = await screen.findByRole("heading", { name: "Generate candidates" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("button", { name: "Hide the tool" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("Application body")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show application" }));
    const applicationHeading = screen.getByRole("heading", { name: "Apply candidates" });
    await waitFor(() => expect(applicationHeading).toHaveFocus());
    expect(screen.getByText("Application body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide application" })).toHaveAttribute("aria-expanded", "true");

    unmount();
    render(<ProblemFirstChallenge {...props}><p>Technique body</p></ProblemFirstChallenge>);
    expect(screen.queryByText("Technique body")).not.toBeInTheDocument();
    expect(screen.queryByText("Application body")).not.toBeInTheDocument();
  });
});
