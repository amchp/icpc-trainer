import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import "./i18n/registerGreedyResources.js";
import { GreedyPage } from "./GreedyPage.js";

const progressState = vi.hoisted(() => ({
  start: vi.fn(),
  setStatus: vi.fn(),
  completed: false
}));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "greedy-learner" }) }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a> }));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: progressState.completed ? [{ guideId: "greedy", status: "completed" }] : [] }),
  useStartLearningGuide: () => ({ mutate: progressState.start }),
  useSetLearningProgressStatus: () => ({ mutate: progressState.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: vi.fn(), error: vi.fn() }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe("GreedyPage", () => {
  beforeEach(async () => {
    progressState.start.mockReset();
    progressState.setStatus.mockReset();
    progressState.completed = false;
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("renders five nested problem-tool-connection challenges and one counterexample interlude", () => {
    render(<GreedyPage />);
    expect(screen.getByRole("heading", { name: "Choose. Justify. Verify." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Problem", { exact: true })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Learn the tool" })).toHaveLength(5);
    expect(screen.queryByText("02 · Problem connection", { exact: true })).not.toBeInTheDocument();
    const coins = document.getElementById("coins");
    const fails = document.getElementById("fails");
    const activities = document.getElementById("activities");
    if (coins === null || fails === null || activities === null) throw new Error("Expected guide sections were not rendered.");
    expect(coins.compareDocumentPosition(fails) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(fails.compareDocumentPosition(activities) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(within(fails).getByRole("button", { name: "Test the rule" })).toHaveAttribute("aria-expanded", "false");
  });

  it("teaches the decision checklist through concrete tools with one narration per animation", () => {
    render(<GreedyPage />);
    expect(screen.queryByLabelText("Five-step greedy recipe")).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Learn the tool" })) fireEvent.click(button);
    expect(screen.getAllByText("02 · Problem connection", { exact: true })).toHaveLength(5);
    expect(document.querySelectorAll("[aria-live='polite']")).toHaveLength(5);
    const coins = screen.getByRole("heading", { name: "Make exact change with as few coins as possible" }).closest("article");
    const activities = screen.getByRole("heading", { name: "Attend the maximum number of compatible activities" }).closest("article");
    if (coins === null || activities === null) throw new Error("Expected the first two challenge articles.");
    expect(within(coins).getByText("The state is the amount still unpaid: 68.")).toBeInTheDocument();
    expect(within(coins).getByText("Commit the 50 coin and change the remainder from 68 to 18.")).toBeInTheDocument();
    expect(within(activities).getByText("Choose A(1,4) because it finishes first among the available activities.")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Show the problem connection" })) fireEvent.click(button);
    expect(screen.getByLabelText("Coin change Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity selection Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Twins Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Chat Room Lab")).toBeInTheDocument();
    expect(screen.getByLabelText("Alternating Subsequence Lab")).toBeInTheDocument();
    expect(document.querySelectorAll("[aria-live='polite']")).toHaveLength(10);
    expect(document.querySelector("code")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/C\+\+|pseudocode/i);
  });

  it("persists only guide-level progress in both directions", () => {
    const first = render(<GreedyPage />);
    expect(progressState.start).toHaveBeenCalledTimes(1);
    expect(progressState.start).toHaveBeenCalledWith("greedy", expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(progressState.setStatus).toHaveBeenCalledWith({ guideId: "greedy", status: "completed" }, expect.any(Object));
    first.unmount();
    progressState.completed = true;
    render(<GreedyPage />);
    fireEvent.click(screen.getByRole("button", { name: "Mark in progress" }));
    expect(progressState.setStatus).toHaveBeenLastCalledWith({ guideId: "greedy", status: "in_progress" }, expect.any(Object));
    expect(JSON.stringify(progressState.setStatus.mock.calls)).not.toMatch(/trace|frame|remaining|cursor|values/i);
  });

  it("rerenders the full journey and current animation narration in Spanish", async () => {
    render(<GreedyPage />);
    fireEvent.click(screen.getAllByRole("button", { name: "Learn the tool" })[0] ?? document.body);
    await i18n.changeLanguage("es");
    expect(screen.getByRole("heading", { name: "Elige. Justifica. Verifica." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Problema", { exact: true })).toHaveLength(5);
    expect(screen.getAllByText("01 · Herramienta", { exact: true })).toHaveLength(5);
    expect(screen.getByText("02 · Conexión con el problema", { exact: true })).toBeInTheDocument();
    expect(document.querySelector("[aria-live='polite']")).toHaveTextContent(/estado|restante/i);
  });
});
