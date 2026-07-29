import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { BruteForcePage } from "./BruteForcePage.js";

const progressState = vi.hoisted(() => ({
  start: vi.fn(),
  setStatus: vi.fn()
}));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "learner-one" }) }));
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

describe("BruteForcePage", () => {
  beforeEach(async () => {
    progressState.start.mockReset();
    progressState.setStatus.mockReset();
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("separates general tools from problem applications and shows no problem-solution code", () => {
    render(<BruteForcePage />);
    const cycleHeadings = screen.getAllByText(/Worked cycle 0[1-4]/).map((node) => node.textContent);
    expect(cycleHeadings).toEqual([
      "Worked cycle 01 · Simulate",
      "Worked cycle 02 · Permute",
      "Worked cycle 03 · Binary decisions",
      "Worked cycle 04 · Backtrack"
    ]);
    expect(screen.queryByLabelText("Recursive permutation trace")).not.toBeInTheDocument();

    const revealButtons = screen.getAllByRole("button", { name: "Learn the tool" });
    expect(revealButtons).toHaveLength(4);
    for (const button of revealButtons) fireEvent.click(button);

    for (const label of [
      "Recursive permutation trace",
      "Iterative permutation trace",
      "Recursive binary-decision trace",
      "Bitmask decision-generation trace"
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Recursive permutation trace")).toHaveTextContent("current.push_back");
    expect(screen.getByLabelText("Recursive permutation trace")).toHaveTextContent("current.pop_back");
    expect(screen.getByText("Determine whether any ordering of five labeled plates satisfies all five pairwise ordering constraints.")).toBeInTheDocument();
    expect(screen.getByLabelText("Recursive permutation trace").querySelector("[data-trace-wide-visuals]")).toContainElement(
      within(screen.getByLabelText("Recursive permutation trace")).getByRole("tree", { name: "Complete decision tree" })
    );
    expect(screen.getByLabelText("Recursive binary-decision trace")).toHaveTextContent("decisions.push_back(0)");
    expect(screen.getByLabelText("Recursive binary-decision trace").querySelector("[data-trace-wide-visuals]")).toContainElement(
      within(screen.getByLabelText("Recursive binary-decision trace")).getByRole("tree", { name: "Complete decision tree" })
    );
    expect(screen.queryByText(/Twenty-one full passes are enough/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Complete backtracking simulation")).not.toBeInTheDocument();

    const applications = screen.getAllByRole("button", { name: "Show the problem connection" });
    expect(applications).toHaveLength(4);
    for (const button of applications) fireEvent.click(button);
    expect(screen.getByText(/Twenty-one full passes are enough/)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Complete backtracking simulation")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Jump to the next backtrack" })).toBeInTheDocument();
    expect(screen.getByText(/Up to 500 cases; 1 ≤ n ≤ 10; target coordinates 1 ≤ a, b ≤ 10/)).toBeInTheDocument();
    expect(screen.getByText(/O\(t · n · 2ⁿ\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal next hint" })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain("#include");
    expect(document.body.textContent).not.toMatch(/\bint main\s*\(/);
    expect(document.body.textContent).not.toContain("target_x");
    expect(document.body.textContent).not.toContain("next_empty_cell");
  });

  it("keeps interaction state local and sends only guide-level progress", () => {
    render(<BruteForcePage />);
    expect(progressState.start).toHaveBeenCalledWith("brute-force", expect.any(Object));
    fireEvent.click(screen.getAllByRole("button", { name: "Learn the tool" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Show the problem connection" }));
    expect(progressState.setStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(progressState.setStatus).toHaveBeenCalledWith(
      { guideId: "brute-force", status: "completed" },
      expect.any(Object)
    );
    expect(JSON.stringify(progressState.setStatus.mock.calls)).not.toMatch(/hint|reveal|trace|frame|candidate/i);
  });

  it("ships the full guide and controls in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(<BruteForcePage />);
    expect(screen.getByRole("heading", { name: "Genera. Comprueba. Retrocede." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Genera permutaciones" })).toBeInTheDocument();
    expect(screen.getByText("Decide si algún orden de cinco platos etiquetados satisface las cinco restricciones de orden entre pares.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Aprender la herramienta" })).toHaveLength(4);
    fireEvent.click(screen.getAllByRole("button", { name: "Aprender la herramienta" })[1]!);
    const permutationTrace = screen.getByLabelText("Traza de permutaciones recursivas");
    fireEvent.click(within(permutationTrace).getByRole("button", { name: "Paso siguiente de la traza" }));
    fireEvent.click(within(permutationTrace).getByRole("button", { name: "Paso siguiente de la traza" }));
    expect(permutationTrace).toHaveTextContent("vector<char> actual");
    expect(permutationTrace).toHaveTextContent("Árbol de decisiones completo");
    // The tree is now nested by parentId rather than bucketed into per-depth rows, so each node
    // owns its children through a treeitem > group > treeitem chain.
    const permutationTree = within(permutationTrace).getByRole("tree", { name: "Árbol de decisiones completo" });
    const treeRoot = within(permutationTree).getByRole("treeitem", { name: "∅" });
    expect(treeRoot).toHaveAttribute("aria-expanded", "true");
    expect(within(treeRoot).getAllByRole("treeitem", { name: "A" })).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Aprender la herramienta" }).at(-1)!);
    fireEvent.click(screen.getAllByRole("button", { name: "Mostrar la conexión con el problema" }).at(-1)!);
    expect(screen.getAllByLabelText("Simulación completa de backtracking")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simular la búsqueda completa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Saltar al siguiente retroceso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Barbells/ })).toBeInTheDocument();
  });
});
