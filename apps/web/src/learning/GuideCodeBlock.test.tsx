import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuideCodeBlock } from "./GuideCodeBlock.js";
import { defineGuideTrace } from "./guideTrace.js";

const code = "if (flag) {\n  print();\n}";
const trace = defineGuideTrace({
  code,
  language: "cpp",
  label: "Example trace",
  inputs: { flag: { kind: "boolean", label: "Flag enabled", defaultValue: false } },
  build: ({ flag }, recorder) => {
    recorder.frame({ line: 1, narration: "Check the flag.", variables: [{ name: "flag", typeLabel: "bool", value: flag }] });
    recorder.frame(flag ? {
      line: 2,
      narration: "Print the value.",
      variables: [{ name: "answer", typeLabel: "int", value: 42 }],
      visuals: [
        { kind: "output", label: "Output", lines: ["42"] },
        { kind: "branch", label: "Branch", condition: "flag", outcome: "true" },
        { kind: "vector", label: "Vector", values: [10, 20], activeIndex: 1 },
        { kind: "callStack", label: "Stack", frames: [{ label: "main" }, { label: "print", detail: "42" }], activeIndex: 1 },
        { kind: "collection", label: "Queue", layout: "queue", values: ["A", "B"], activeIndex: 0, markers: [{ index: 0, label: "front" }, { index: 1, label: "back" }] },
        { kind: "entries", label: "Entries", entries: [{ key: "name", value: 2 }], activeIndex: 0 }
      ]
    } : { line: 3, narration: "Skip the body." });
  }
});

const setReducedMotion = (initialMatches: boolean): { set: (matches: boolean) => void } => {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    get matches() { return matches; },
    addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener))
  };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return {
    set: (nextMatches) => {
      matches = nextMatches;
      act(() => {
        for (const listener of listeners) listener({ matches: nextMatches } as MediaQueryListEvent);
      });
    }
  };
};

describe("GuideCodeBlock", () => {
  const writeText = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    setReducedMotion(false);
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("preserves static rendering and the exact Copy payload", async () => {
    const { container } = render(<GuideCodeBlock code={code} />);
    expect(container.querySelector("[aria-current='step']")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(code));
  });

  it("updates the active line, narration, selected variables, and typed visuals together", () => {
    const { container } = render(<GuideCodeBlock trace={trace} />);
    const previous = screen.getByRole("button", { name: "Previous trace step" });
    const next = screen.getByRole("button", { name: "Next trace step" });

    expect(previous).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Check the flag");
    expect(container.querySelectorAll("[aria-current='step']")).toHaveLength(1);
    expect(container.querySelector("[aria-current='step']")).toHaveAttribute("data-guide-line", "1");
    expect(screen.getByRole("rowheader", { name: "flag" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Flag enabled" }));
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    fireEvent.click(next);

    expect(screen.getByText("Print the value.", { selector: "p[role='status']" })).toBeInTheDocument();
    expect(container.querySelector("[aria-current='step']")).toHaveAttribute("data-guide-line", "2");
    expect(screen.queryByRole("rowheader", { name: "flag" })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "answer" })).toBeInTheDocument();
    expect(screen.getByText("42", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
    expect(screen.getByText("Vector")).toBeInTheDocument();
    expect(screen.getByText("Queue")).toBeInTheDocument();
    expect(screen.getByText("front")).toBeInTheDocument();
    expect(screen.getByText("Entries")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getAllByText("print")).toHaveLength(2);
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Reset trace" }));
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Flag enabled" })).toBeChecked();
  });

  it("plays at 1,200 ms and stops at the final frame", () => {
    vi.useFakeTimers();
    render(<GuideCodeBlock trace={trace} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");
    act(() => vi.advanceTimersByTime(1199));
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("disables autoplay for reduced motion while retaining manual controls", () => {
    setReducedMotion(true);
    render(<GuideCodeBlock trace={trace} />);

    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByText(/Manual stepping remains available/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next trace step" })).toBeEnabled();
  });

  it("clears pending playback on pause, reset, input, motion, trace replacement, and unmount", () => {
    vi.useFakeTimers();
    const motion = setReducedMotion(false);
    const replacement = defineGuideTrace({ ...trace, label: "Replacement trace" });
    const { rerender, unmount } = render(<GuideCodeBlock trace={trace} />);
    const play = (): void => {
      fireEvent.click(screen.getByRole("button", { name: "Play" }));
    };

    play();
    expect(vi.getTimerCount()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(vi.getTimerCount()).toBe(0);

    play();
    fireEvent.click(screen.getByRole("button", { name: "Reset trace" }));
    expect(vi.getTimerCount()).toBe(0);

    play();
    fireEvent.click(screen.getByRole("checkbox", { name: "Flag enabled" }));
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();

    play();
    motion.set(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    motion.set(false);

    play();
    rerender(<GuideCodeBlock trace={replacement} />);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByLabelText("Replacement trace")).toBeInTheDocument();

    play();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rebuilds from frame zero on input change without changing copied C++", async () => {
    render(<GuideCodeBlock trace={trace} />);
    fireEvent.click(screen.getByRole("button", { name: "Next trace step" }));
    expect(screen.getByText("Skip the body.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Flag enabled" }));
    expect(screen.getByText("Check the flag.")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(code));
  });

  it("logs an invalid trace once and falls back to the static code block", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const invalid = defineGuideTrace({ code, language: "cpp", label: "Broken trace", inputs: {}, build: () => undefined });
    const { container, rerender } = render(<GuideCodeBlock trace={invalid} />);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("Broken trace"));
    expect(screen.queryByRole("button", { name: "Next trace step" })).not.toBeInTheDocument();
    expect(container.querySelector("[data-guide-line='1']")).toBeInTheDocument();
    rerender(<GuideCodeBlock trace={invalid} />);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
