import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProblemFirstChallenge } from "./ProblemFirstChallenge.js";
import type { StatementDefinition } from "./StatementPreview.js";

const statement: StatementDefinition = {
  description: "Find whether the requested value occurs in the list.",
  input: "A list of integers and a target value.",
  output: "YES if the target occurs; otherwise NO.",
  exampleInput: "values = [4, 8, 2]; target = 8",
  exampleOutput: "YES",
  frames: [
    { narration: "These are the given values.", visuals: [{ kind: "vector", label: "Values", values: [4, 8, 2] }] },
    { narration: "The target is the value you are asked about.", visuals: [{ kind: "entries", label: "Request", entries: [{ key: "target", value: 8 }] }] },
    { narration: "Your answer must be YES or NO.", visuals: [{ kind: "output", label: "Answer format", lines: ["YES / NO"] }] }
  ]
};

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
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it("supports an original learning challenge without inventing an external source", () => {
    const { sourceUrl: _sourceUrl, sourceLabel: _sourceLabel, ...originalChallengeProps } = props;
    render(<ProblemFirstChallenge {...originalChallengeProps}><p>Technique body</p></ProblemFirstChallenge>);

    expect(screen.queryByRole("link", { name: "Open problem" })).not.toBeInTheDocument();
  });

  it("explains input and output before the reveal, and never reveals a solution while playing", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ProblemFirstChallenge {...props} statement={statement}><p>Technique body</p></ProblemFirstChallenge>);
    expect(screen.getByText(statement.description)).toBeInTheDocument();
    expect(screen.queryByText(props.description)).not.toBeInTheDocument();
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Example input")).toBeInTheDocument();
    expect(screen.getByText("Example output")).toBeInTheDocument();
    const player = screen.getByRole("region", { name: "Statement animation: Tiny challenge" });
    fireEvent.click(within(player).getByRole("button", { name: "Play" }));
    act(() => vi.advanceTimersByTime(2200));
    expect(player).toHaveTextContent(statement.frames[1]!.narration);
    act(() => vi.advanceTimersByTime(2200));
    expect(player).toHaveTextContent(statement.frames[2]!.narration);
    expect(screen.getByRole("button", { name: "Show the tool" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Technique body")).not.toBeInTheDocument();
    expect(screen.queryByText("Application body")).not.toBeInTheDocument();
    fireEvent.click(within(player).getByRole("button", { name: "Reset trace" }));
    expect(player).toHaveTextContent(statement.frames[0]!.narration);
  });

  it("allows manual statement stepping with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ProblemFirstChallenge {...props} statement={statement}><p>Technique body</p></ProblemFirstChallenge>);
    const player = screen.getByRole("region", { name: "Statement animation: Tiny challenge" });
    expect(within(player).getByRole("button", { name: "Play" })).toBeDisabled();
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(player).toHaveTextContent(statement.frames[1]!.narration);
    expect(screen.queryByText("Technique body")).not.toBeInTheDocument();
  });
});
