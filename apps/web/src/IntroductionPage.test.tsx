import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IntroductionPage } from "./IntroductionPage.js";

const state = vi.hoisted(() => ({
  start: vi.fn(),
  setStatus: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
}));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "learner-one" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: state.start }),
  useSetLearningProgressStatus: () => ({ mutate: state.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: state.success, error: state.error }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe("IntroductionPage", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    state.start.mockReset();
    state.setStatus.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders ten interwoven sections, three games, and the exact future roadmap", () => {
    render(<IntroductionPage />);

    expect(screen.getByRole("heading", { name: "Enter the contest room." })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Explain how to reason about the winner" })).toHaveLength(3);
    expect(screen.getByRole("img", { name: "7 by 7 Plate Game board" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "25 Stones game" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "5 by 7 Chomp board" })).toBeInTheDocument();
    expect(screen.queryByText(/\b\d{2} min\b/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How competitive programming works." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Install C++." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Programming languages." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "C++" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Python" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Pros" })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { name: "Cons" })).toHaveLength(2);
    expect(screen.getByText(/Static types let the compiler catch many mistakes/)).toBeInTheDocument();
    expect(screen.getByText(/Use C\+\+ as your default while learning this course/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to practice." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Understanding Codeforces." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plate Game." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "25 Stones." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chomp." })).toBeInTheDocument();
    expect(screen.queryByText(/find the symmetry/)).not.toBeInTheDocument();
    expect(screen.queryByText("Today’s route")).not.toBeInTheDocument();
    expect(screen.queryByText("Understand")).not.toBeInTheDocument();
    expect(screen.queryByText("Turn one small program into an Accepted verdict.")).not.toBeInTheDocument();
    expect(screen.getByText(/Build problem-solving skills by solving many Problems/)).toBeInTheDocument();
    expect(screen.queryByText("Volume builds recognition. Upsolving makes it stick.")).not.toBeInTheDocument();
    expect(screen.queryByText(/C\+\+17/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "A. Watermelon" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Statement" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Input" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Output" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Example" })).toBeInTheDocument();
    expect(screen.getByText(/The Input section defines exactly what your program reads/)).toBeInTheDocument();
    expect(screen.getByText(/Printing an explanation instead of exactly YES or NO/)).toBeInTheDocument();
    expect(screen.getByText(/weight must be even and greater than 2/)).toBeInTheDocument();
    expect(screen.getByText(/If both players play optimally, Player 1 wins/)).toBeInTheDocument();
    expect(screen.queryByText(/Start with very small piles/)).not.toBeInTheDocument();
    expect(screen.queryByText("Read")).not.toBeInTheDocument();
    expect(screen.queryByText("Design")).not.toBeInTheDocument();
    expect(screen.getByText(/The important object is not the last bite/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How difficult is a contest?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create your Codeforces account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a Codeforces account" })).toHaveAttribute("href", "https://codeforces.com/register");
    expect(screen.getByText(/start reading the editorial and stop as soon as it gives you a new idea/)).toBeInTheDocument();
    expect(screen.getByText(/division and rating eligibility indicate the intended participant range/)).toBeInTheDocument();
    expect(screen.getByText(/Gym contains archived and community sets/)).toBeInTheDocument();
    expect(screen.getByText(/Start with a 1- or 2-star Gym/)).toBeInTheDocument();
    expect(screen.queryByText(/Some sets require group access or a password/)).not.toBeInTheDocument();
    expect(screen.getByText(/Problemset is the searchable catalog/)).toBeInTheDocument();
    expect(screen.getByText(/Start with a Div\. 4 contest/)).toBeInTheDocument();
    expect(screen.queryByText(/virtual participation can reproduce/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Do not search only for an attractive first move/)).not.toBeInTheDocument();
    expect(screen.queryByText("Environment")).not.toBeInTheDocument();
    for (const overTitle of ["Mental model", "Competition", "Play break", "Judge workflow", "Habit", "Capstone game", "Direction"]) {
      expect(screen.queryByText(overTitle)).not.toBeInTheDocument();
    }
    const competitionLevels = screen.getByRole("list", { name: "ICPC competition levels" });
    expect(within(competitionLevels).getAllByRole("heading").map((heading) => heading.textContent)).toEqual([
      "University internal competition",
      "National competition",
      "Regional competition",
      "Regional Championship",
      "World Finals"
    ]);
    expect(within(competitionLevels).getAllByRole("listitem")).toHaveLength(5);
    expect(within(competitionLevels).getByText(/select representatives and help new teams practice/)).toBeInTheDocument();
    expect(within(competitionLevels).getByText(/determines or helps determine World Finals qualification/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Find your way around Codeforces" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Match source to compiler" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Contests" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Gym" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Problemset" })).toBeInTheDocument();

    const futureRoadmap = screen.getByRole("list", { name: "Your next ten Learning Topics." });
    expect(within(futureRoadmap).getAllByRole("listitem")).toHaveLength(10);
    expect(within(futureRoadmap).queryAllByRole("link")).toHaveLength(0);
    expect(within(futureRoadmap).getAllByText("Future guide")).toHaveLength(10);
  });

  it("links inspectable installer assets and uses Introduction progress", () => {
    render(<IntroductionPage />);

    expect(screen.getAllByRole("link", { name: "View source" }).map((link) => link.getAttribute("href"))).toEqual([
      "/setup/install-cpp-vscode.ps1",
      "/setup/install-cpp-vscode-macos.sh"
    ]);
    expect(screen.getByText("Windows · PowerShell")).toBeInTheDocument();
    expect(screen.getByText(/main\.exe/)).toBeInTheDocument();
    expect(screen.getByText("Apple Silicon · Terminal")).toBeInTheDocument();
    expect(screen.getByText(/brew list --versions gcc/)).toBeInTheDocument();
    expect(state.start).toHaveBeenCalledWith(LEARNING_GUIDE_IDS.Introduction, expect.any(Object));

    fireEvent.click(screen.getByRole("button", { name: "Mark guide complete" }));
    expect(state.setStatus).toHaveBeenCalledWith({
      guideId: LEARNING_GUIDE_IDS.Introduction,
      status: LEARNING_PROGRESS_STATUSES.Completed
    }, expect.any(Object));
  });
});
