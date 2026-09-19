import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import "./i18n/registerDynamicProgrammingResources.js";
import { DynamicProgrammingPage } from "./DynamicProgrammingPage.js";

const progressState = vi.hoisted(() => ({ start: vi.fn(), setStatus: vi.fn() }));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "dp-learner" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: progressState.start }),
  useSetLearningProgressStatus: () => ({ mutate: progressState.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: vi.fn(), error: vi.fn() }) }));

class ObserverStub { observe(): void {} disconnect(): void {} }

function revealAll(): readonly HTMLElement[] {
  for (const button of screen.getAllByRole("button", { name: "Reveal the DP tool" })) fireEvent.click(button);
  for (const button of screen.getAllByRole("button", { name: "Reveal the guided solution" })) fireEvent.click(button);
  return [...document.querySelectorAll<HTMLElement>("[data-scenario-player='true']:not([data-statement-preview] *)")];
}

describe("DynamicProgrammingPage", () => {
  beforeEach(async () => {
    progressState.start.mockReset();
    progressState.setStatus.mockReset();
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  it("keeps the reusable DP tool separate from the problem-specific solution", () => {
    render(<DynamicProgrammingPage />);
    for (const arc of ["fibonacci", "nonAdjacent", "grid", "knapsack", "dag"]) {
      const section = document.querySelector<HTMLElement>(`#${arc}`);
      if (section === null) throw new Error(`${arc} section was not rendered.`);

      const toolButton = within(section).getByRole("button", { name: "Reveal the DP tool" });
      fireEvent.click(toolButton);
      expect(section.querySelector(`[data-state-transition-lens='${arc}']`)).toBeNull();
      const toolPanel = document.getElementById(toolButton.getAttribute("aria-controls") ?? "");
      expect(toolPanel).toBeInTheDocument();
      expect(toolPanel).not.toHaveTextContent(/F\(|best\(|paths\(|endingAt\(|capacityLimit|capacidadLímite/);
      expect(toolPanel).not.toHaveTextContent(/linear O\(n\)|lineal O\(n\)/i);
      const diagram = section.querySelector<HTMLElement>(`[data-memoization-diagram='${arc}']`);
      if (arc === "knapsack") {
        expect(diagram).toBeNull();
      } else {
        expect(diagram).toBeInTheDocument();
        expect(diagram!.querySelectorAll("[data-recursion-tree]")).toHaveLength(2);
        const withoutMemory = diagram!.querySelector<HTMLElement>("[data-recursion-tree='without-memory']");
        const withMemory = diagram!.querySelector<HTMLElement>("[data-recursion-tree='with-memory']");
        expect(withoutMemory).toBeInTheDocument();
        expect(withMemory).toBeInTheDocument();
        expect(withoutMemory).toHaveAttribute("data-tree-request-count", "25");
        expect(withMemory).toHaveAttribute("data-tree-request-count", "11");
        expect(withMemory).toHaveAttribute("data-tree-computed-count", "7");
        expect(withoutMemory!.querySelectorAll("[data-tree-node]")).toHaveLength(25);
        expect(withMemory!.querySelectorAll("[data-tree-node]")).toHaveLength(11);
        expect(diagram!.querySelectorAll("[data-recalculated='true']").length).toBeGreaterThan(0);
        expect(diagram!.querySelectorAll("[data-memo-hit='true']").length).toBeGreaterThan(0);
        expect([...withoutMemory!.querySelectorAll<HTMLElement>("[data-recalculated='true']")].some((node) =>
          withoutMemory!.querySelector(`[data-edge-from='${node.dataset.nodeId}']`) !== null
        )).toBe(true);
        expect(diagram!.querySelector("[data-memo-hit='true']")).toHaveClass("text-amber-100");
        for (const hit of withMemory!.querySelectorAll<HTMLElement>("[data-memo-hit='true']")) {
          expect(withMemory!.querySelectorAll(`[data-edge-from='${hit.dataset.nodeId}']`)).toHaveLength(0);
        }
        expect(diagram!.querySelector("[data-memo-complexity-before]")).toHaveAccessibleName(/without memory/i);
        expect(diagram!.querySelector("[data-memo-complexity-after]")).toHaveAccessibleName(/with memory/i);
        expect(diagram!.querySelector("[data-memo-complexity-before]")).toHaveTextContent("O(calls in the recursion tree)");
        expect(diagram!.querySelector("[data-memo-complexity-after]")).toHaveTextContent("O(states + transitions)");
        if (arc === "grid") expect(diagram).not.toHaveTextContent(/\(\d,\d\)/);
      }
      if (arc === "fibonacci") {
        const structure = section.querySelector<HTMLElement>("[data-dp-structure='fibonacci']");
        expect(structure).toBeInTheDocument();
        const skeleton = structure!.querySelector("[data-generic-dp-skeleton]");
        expect(skeleton).toHaveTextContent("int go(State state)");
        expect(skeleton).toHaveTextContent("int& ans = dp[state]");
        expect(skeleton).toHaveTextContent("if (ans != UNCOMPUTED) return ans");
        expect(skeleton).toHaveTextContent("// Transitions");
        expect(skeleton).not.toHaveTextContent(/Fibonacci|values|grid|capacity|node/);
      } else {
        expect(section.querySelector("[data-dp-structure]")).toBeNull();
        expect(section.querySelector("[data-generic-dp-skeleton]")).toBeNull();
      }
      expect(section.querySelector("[data-dp-code-walkthrough]")).toBeNull();
      expect(section.querySelector("[data-scenario-player='true']:not([data-statement-preview] *)")).toBeNull();

      fireEvent.click(within(section).getByRole("button", { name: "Reveal the guided solution" }));
      expect(section.querySelector(`[data-state-transition-lens='${arc}']`)).toBeInTheDocument();
      expect(section.querySelector("[data-dp-code-walkthrough]")).toBeNull();
      expect(section.querySelector("pre.prism-code")).toBeNull();
      expect(section.querySelector("[data-scenario-player='true']:not([data-statement-preview] *)")).toBeInTheDocument();
      expect(section.querySelector(`[data-implementation-mission='${arc}']`)).toBeInTheDocument();
    }
  });

  it("adds one reusable state idea at a time without revealing an arc solution", () => {
    render(<DynamicProgrammingPage />);
    const expectedTools = [
      ["fibonacci", "DP starts by naming and remembering states"],
      ["nonAdjacent", "A state can be an array index"],
      ["grid", "A state can need more than one coordinate"],
      ["knapsack", "A state stores only what the future still needs"],
      ["dag", "States are nodes; transitions are directed edges"]
    ] as const;

    for (const [arc, title] of expectedTools) {
      const section = document.querySelector<HTMLElement>(`#${arc}`);
      if (section === null) throw new Error(`${arc} section was not rendered.`);
      fireEvent.click(within(section).getByRole("button", { name: "Reveal the DP tool" }));
      expect(within(section).getByRole("heading", { name: title })).toBeInTheDocument();
      expect(section.querySelector("[data-state-transition-lens]")).toBeNull();
    }
  });

  it("shows why an index-only state can cause WA before solving knapsack", () => {
    render(<DynamicProgrammingPage />);
    const section = document.querySelector<HTMLElement>("#knapsack");
    if (section === null) throw new Error("Knapsack section was not rendered.");
    fireEvent.click(within(section).getByRole("button", { name: "Reveal the DP tool" }));

    const collision = section.querySelector<HTMLElement>("[data-state-collision-demo='knapsack']");
    expect(collision).toBeInTheDocument();
    expect(collision).toHaveTextContent("i = 3, remaining = 4");
    expect(collision).toHaveTextContent("i = 3, remaining = 1");
    expect(collision).toHaveTextContent("dp[3]");
    expect(collision).toHaveTextContent("Wrong Answer (WA)");
    expect(collision).toHaveTextContent("state(3, 4)");
    expect(collision).toHaveTextContent("state(3, 1)");
    expect(section.querySelector("[data-memoization-diagram='knapsack']")).toBeNull();
    expect(section.querySelector("[data-state-transition-lens]")).toBeNull();
  });

  it("presents DP abstractly as a directed acyclic graph before the DAG solution", () => {
    render(<DynamicProgrammingPage />);
    const section = document.querySelector<HTMLElement>("#dag");
    if (section === null) throw new Error("DAG section was not rendered.");
    fireEvent.click(within(section).getByRole("button", { name: "Reveal the DP tool" }));

    const abstraction = section.querySelector<HTMLElement>("[data-dp-dag-abstraction]");
    expect(abstraction).toBeInTheDocument();
    expect(abstraction).toHaveTextContent("State = node");
    expect(abstraction).toHaveTextContent("Transition = directed edge");
    expect(abstraction).toHaveTextContent("Acyclic = evaluation order");
    expect(abstraction).toHaveTextContent(/dependency.*ready.*reuse/i);
    expect(section.querySelector("[data-state-transition-lens]")).toBeNull();
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("renders five arcs, separates tools from solutions, and never reveals solution code", () => {
    render(<DynamicProgrammingPage />);
    expect(screen.getByRole("heading", { name: "Name the state. Write the transition." })).toBeInTheDocument();
    expect([...document.querySelectorAll("main section[id] > div > h2")].map((heading) => heading.textContent)).toEqual([
      "1D · Fibonacci",
      "1D array · Non-adjacent sum",
      "2D board · Grid paths",
      "2D choices · 0/1 knapsack",
      "Graph · Longest path in a DAG"
    ]);
    expect(screen.getAllByText("00 · Learning Challenge", { exact: true })).toHaveLength(5);
    expect(document.querySelectorAll("[data-statement-preview] [data-scenario-player]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-state-transition-lens]")).toHaveLength(0);
    const players = revealAll();
    expect(document.querySelectorAll("[data-state-transition-lens]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-memoization-diagram]")).toHaveLength(4);
    expect(document.querySelectorAll("[data-recursion-tree]")).toHaveLength(8);
    expect(document.querySelectorAll("[data-brute-force-bridge]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-recursive-dp-blueprint]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-dp-code-walkthrough]")).toHaveLength(0);
    expect(document.querySelectorAll("pre.prism-code")).toHaveLength(0);
    expect(document.querySelectorAll("[data-implementation-mission]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-dp-structure]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-generic-dp-skeleton]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-state-collision-demo='knapsack']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-dp-dag-abstraction]")).toHaveLength(1);
    expect(players).toHaveLength(5);
    for (const player of players) expect(player.querySelectorAll("[data-scenario-preset]")).toHaveLength(2);

    const sourceLinks = screen.getAllByRole("link", { name: "Open the judge Problem" });
    expect(sourceLinks).toHaveLength(2);
    expect(within(document.querySelector("#grid")!).getByRole("link", { name: "Open the judge Problem" }))
      .toHaveAttribute("href", "https://cses.fi/problemset/task/1638");
    expect(within(document.querySelector("#knapsack")!).getByRole("link", { name: "Open the judge Problem" }))
      .toHaveAttribute("href", "https://cses.fi/problemset/task/1158");
    for (const arc of ["fibonacci", "nonAdjacent", "dag"]) {
      expect(within(document.querySelector(`#${arc}`)!).queryByRole("link", { name: "Open the judge Problem" })).toBeNull();
    }

    expect(screen.getByRole("link", { name: "Solve Grid Paths on CSES" }))
      .toHaveAttribute("href", "https://cses.fi/problemset/task/1638");
    expect(screen.getByRole("link", { name: "Solve Book Shop on CSES" }))
      .toHaveAttribute("href", "https://cses.fi/problemset/task/1158");
  });

  it("keeps trace state local and persists only guide-level progress", () => {
    render(<DynamicProgrammingPage />);
    expect(progressState.start).toHaveBeenCalledWith("dynamic-programming", expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Mark guide complete" }));
    expect(progressState.setStatus).toHaveBeenCalledWith({ guideId: "dynamic-programming", status: "completed" }, expect.any(Object));
    const [player] = revealAll();
    if (player === undefined) throw new Error("Fibonacci player was not rendered.");
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(player).toHaveTextContent(/Step 2 of/);
    expect(JSON.stringify(progressState.setStatus.mock.calls)).not.toMatch(/frame|preset|fibonacci|knapsack/);
  });

  it("ships the complete five-topic journey in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(<DynamicProgrammingPage />);
    expect(screen.getByRole("heading", { name: "Nombra el estado. Escribe la transición." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Reto de aprendizaje", { exact: true })).toHaveLength(5);
    for (const button of screen.getAllByRole("button", { name: "Revelar la herramienta de DP" })) fireEvent.click(button);
    expect(screen.getByRole("heading", { name: "La DP comienza al nombrar y recordar estados" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Un estado puede ser un índice de un arreglo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Un estado puede necesitar varias coordenadas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Un estado guarda solo lo que el futuro todavía necesita" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Los estados son nodos; las transiciones son aristas dirigidas" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-statement-preview] [data-scenario-player]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-state-transition-lens]")).toHaveLength(0);
    for (const button of screen.getAllByRole("button", { name: "Revelar la solución guiada" })) fireEvent.click(button);
    expect(document.querySelectorAll("[data-memoization-diagram]")).toHaveLength(4);
    expect(document.querySelectorAll("[data-recursion-tree]")).toHaveLength(8);
    expect(document.querySelectorAll("[data-state-transition-lens]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-brute-force-bridge]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-recursive-dp-blueprint]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-dp-code-walkthrough]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-implementation-mission]")).toHaveLength(5);
    expect(document.querySelectorAll("[data-dp-structure]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-generic-dp-skeleton]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-state-collision-demo='knapsack']")).toHaveLength(1);
    expect(document.querySelectorAll("[data-dp-dag-abstraction]")).toHaveLength(1);
    expect(screen.getByText("Respuesta incorrecta (WA)")).toBeInTheDocument();
    expect(screen.getByText("i = 3, restante = 4")).toBeInTheDocument();
    expect(screen.getByText("Estado = nodo")).toBeInTheDocument();
    const players = document.querySelectorAll<HTMLElement>("[data-scenario-player='true']:not([data-statement-preview] *)");
    expect(players).toHaveLength(5);
    for (const player of players) expect(player.querySelectorAll("[data-scenario-preset]")).toHaveLength(2);
  });
});
