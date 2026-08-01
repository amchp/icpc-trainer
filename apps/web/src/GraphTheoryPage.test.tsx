import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GraphTheoryPage } from "./GraphTheoryPage.js";
import { i18n } from "./i18n/i18n.js";
import "./i18n/registerGraphTheoryResources.js";

const progressState = vi.hoisted(() => ({ start: vi.fn(), setStatus: vi.fn() }));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "graph-learner" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: progressState.start }),
  useSetLearningProgressStatus: () => ({ mutate: progressState.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: vi.fn(), error: vi.fn() }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

function revealGuide(): readonly HTMLElement[] {
  const tools = screen.getAllByRole("button", { name: "Learn the tool" });
  for (const button of tools) fireEvent.click(button);
  const applications = screen.getAllByRole("button", { name: "Show the problem connection" });
  for (const button of applications) fireEvent.click(button);
  return [
    screen.getByLabelText("Counting Rooms scenarios"), screen.getByLabelText("Labyrinth scenarios"),
    screen.getByLabelText("Building Teams scenarios"), screen.getByLabelText("Course Schedule scenarios"),
    screen.getByLabelText("Shortest Routes scenarios")
  ];
}

describe("GraphTheoryPage", () => {
  beforeEach(async () => {
    progressState.start.mockReset();
    progressState.setStatus.mockReset();
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("ships five gated seven-stage arcs with three curated problem presets", () => {
    render(<GraphTheoryPage />);
    expect(screen.getByRole("heading", { name: "Model relationships. Traverse with purpose." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Problem", { exact: true })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Learn the tool" })).toHaveLength(5);
    const problemPlayers = revealGuide();
    expect(document.querySelectorAll("[data-scenario-player='true']").length).toBeGreaterThanOrEqual(10);
    for (const player of problemPlayers) {
      const presets = player.querySelectorAll("[data-scenario-preset]");
      expect(presets).toHaveLength(3);
      expect(player.querySelectorAll("[data-scenario-preset][aria-selected='true']")).toHaveLength(1);
    }
  });

  it("keeps applications code-free and resets a frame when the preset changes", () => {
    render(<GraphTheoryPage />);
    const [rooms] = revealGuide();
    expect(document.body.textContent).not.toMatch(/\bint\s+main\b|\bcin\b|\bcout\b|\bscanf\b|\bprintf\b/);
    if (rooms === undefined) throw new Error("Rooms animation was not rendered.");
    fireEvent.click(within(rooms).getByRole("button", { name: "Next trace step" }));
    expect(rooms.textContent).toMatch(/Step 2 of \d+/);
    const presets = within(rooms).getAllByRole("tab");
    const secondPreset = presets[1];
    if (secondPreset === undefined) throw new Error("Second rooms preset was not rendered.");
    fireEvent.click(secondPreset);
    expect(rooms.textContent).toMatch(/Step 1 of \d+/);
  });

  it("runs complete general examples and isolates the cycle counterexample", () => {
    render(<GraphTheoryPage />);
    for (const button of screen.getAllByRole("button", { name: "Learn the tool" })) fireEvent.click(button);

    const dfs = screen.getByRole("region", { name: "DFS follows one branch before backtracking" });
    const dfsNext = within(dfs).getByRole("button", { name: "Next trace step" });
    while (!dfsNext.hasAttribute("disabled")) fireEvent.click(dfsNext);
    expect(dfs).toHaveTextContent("Step 11 of 11");
    expect(dfs.querySelectorAll("[data-node-tone='settled']")).toHaveLength(7);

    const bfs = screen.getByRole("region", { name: "BFS expands in distance layers" });
    expect(within(bfs).getByRole("img", { name: "BFS graph and distance layers" })).toBeInTheDocument();
    const bfsNext = within(bfs).getByRole("button", { name: "Next trace step" });
    while (!bfsNext.hasAttribute("disabled")) fireEvent.click(bfsNext);
    expect(bfs).toHaveTextContent("Step 15 of 15");
    expect(bfs.querySelectorAll("[data-node-tone='settled']")).toHaveLength(7);

    const indegree = screen.getByRole("region", { name: "Indegree drives topological order" });
    expect(indegree.querySelectorAll("[data-scenario-preset]")).toHaveLength(2);
    const cycle = within(indegree).getByRole("tab", { name: "Cycle failure" });
    fireEvent.click(cycle);
    expect(indegree).toHaveTextContent("Step 1 of 2");
    fireEvent.click(within(indegree).getByRole("button", { name: "Next trace step" }));
    expect(indegree).toHaveTextContent(/no topological order exists/i);

    const relaxation = screen.getByRole("region", { name: "Relax tentative distances" });
    const relaxationNext = within(relaxation).getByRole("button", { name: "Next trace step" });
    while (!relaxationNext.hasAttribute("disabled")) fireEvent.click(relaxationNext);
    expect(relaxation).toHaveTextContent("Step 9 of 9");
    expect(relaxation).toHaveTextContent(/final distances are 0, 5, 2/i);
  });

  it("persists only guide-level progress", () => {
    render(<GraphTheoryPage />);
    expect(progressState.start).toHaveBeenCalledWith("graph-theory", expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(progressState.setStatus).toHaveBeenCalledWith({ guideId: "graph-theory", status: "completed" }, expect.any(Object));
    expect(JSON.stringify(progressState.setStatus.mock.calls)).not.toMatch(/preset|frame|step|visited|dist/i);
  });

  it("renders accessible non-colour grid and graph markers", () => {
    render(<GraphTheoryPage />);
    const [rooms, , teams] = revealGuide();
    if (rooms === undefined || teams === undefined) throw new Error("Graph animations were not rendered.");
    fireEvent.click(within(rooms).getByRole("button", { name: "Next trace step" }));
    fireEvent.click(within(teams).getByRole("button", { name: "Next trace step" }));
    const adjacency = screen.getByRole("region", { name: "An undirected edge appears in both adjacency lists" });
    fireEvent.click(within(adjacency).getByRole("button", { name: "Next trace step" }));
    expect(document.querySelector("[data-tone='visited']")).toBeInTheDocument();
    expect(document.querySelector("[data-tone='wall']")).toBeInTheDocument();
    expect(document.querySelector("[data-node-tone='colorA']")).toBeInTheDocument();
    expect(document.querySelector("[data-node-tone='colorB']")).toBeInTheDocument();
    expect(document.querySelector("[data-edge-tone='tree']")).toBeInTheDocument();
    expect(document.querySelectorAll(".sr-only li").length).toBeGreaterThan(0);
  });

  it("teaches graph storage before BFS and keeps Building Teams focused on two-colouring", () => {
    render(<GraphTheoryPage />);
    for (const button of screen.getAllByRole("button", { name: "Learn the tool" })) fireEvent.click(button);
    expect(screen.getByRole("heading", { name: "Represent the same graph with a list or a matrix" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Adjacency matrix for the five-node example" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test a graph with two-colouring" })).toBeInTheDocument();
    expect(screen.getByText("The reusable two-colouring test")).toBeInTheDocument();
  });

  it("ships the complete guide in Spanish without reserved roster terminology", async () => {
    await i18n.changeLanguage("es");
    render(<GraphTheoryPage />);
    expect(screen.getByRole("heading", { name: "Modela relaciones. Recorre con intención." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Problema", { exact: true })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Aprender la herramienta" })).toHaveLength(5);
    expect(document.body.textContent).not.toMatch(/\bClass\b|\bClase\b/i);
  });
});
