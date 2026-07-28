import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { DataStructuresPage } from "./DataStructuresPage.js";

const state = vi.hoisted(() => ({
  start: vi.fn(),
  setStatus: vi.fn()
}));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "learner-one" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) =>
    <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: state.start }),
  useSetLearningProgressStatus: () => ({ mutate: state.setStatus, isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: vi.fn(), error: vi.fn() }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe("DataStructuresPage", () => {
  beforeEach(async () => {
    state.start.mockReset();
    state.setStatus.mockReset();
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("renders seven problem dossiers with constraints inside input before an unguided attempt pause", () => {
    render(<DataStructuresPage />);

    const problemSections = ["numeric", "vector", "stack", "queue", "set", "map", "ranges"].map((id) =>
      document.getElementById(id)
    );
    expect(problemSections.every((section) => section !== null)).toBe(true);
    for (const section of problemSections) {
      const problemCard = section!.querySelector(":scope > div > div:first-child");
      const challenge = within(section!).getByText("The challenge");
      const thinking = within(section!).getByRole("heading", { name: "Try to solve it before continuing" });
      const toolbox = within(section!).getByRole("button", { name: /Learn the tool/ });
      expect(within(section!).getByText("What you receive")).toBeInTheDocument();
      expect(within(section!).getByText("What you must produce")).toBeInTheDocument();
      expect(within(section!).queryByText("Important constraints")).not.toBeInTheDocument();
      expect(within(section!).getByText("How the answer is obtained")).toBeInTheDocument();
      expect(within(section!).queryByRole("list")).not.toBeInTheDocument();
      expect(problemCard).toHaveClass("border-zinc-800");
      expect(problemCard?.className).not.toMatch(/border-(cyan|blue|violet|amber|emerald|rose)-400/);
      expect(challenge.compareDocumentPosition(thinking) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(thinking.compareDocumentPosition(toolbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const numeric = problemSections[0]!;
    const numericInput = within(numeric).getByText("What you receive").closest("div");
    expect(numericInput).toHaveTextContent("Each can be as large as 10⁹");
    expect(numericInput).not.toHaveTextContent("product can reach");
    const paintedGrid = within(numeric).getByRole("img", { name: "3 rows by 4 columns: 12 painted cells" });
    expect(paintedGrid.children).toHaveLength(12);
    const numericThinking = within(numeric).getByRole("heading", { name: "Try to solve it before continuing" });
    const numericToolbox = within(numeric).getByRole("button", { name: /Learn the tool/ });
    const experiment = within(numeric).getByText("The same expression passes a small test and fails at scale");
    expect(numericThinking.compareDocumentPosition(numericToolbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(numericToolbox.compareDocumentPosition(experiment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(experiment).not.toBeVisible();
    expect(numeric).not.toHaveTextContent("A small grid makes the program look obviously correct");
    expect(document.getElementById("vector")).toHaveTextContent("100,000 price");
    expect(document.getElementById("vector")).toHaveTextContent("budgets [1, 6, 9, 10]");
    expect(document.getElementById("vector")).toHaveTextContent("A budget of 6 can afford prices 3 and 6");
    expect(document.getElementById("set")).toHaveTextContent("Only lowercase letters are data");
    expect(document.getElementById("set")).toHaveTextContent("Ignore braces, commas, and spaces");
    expect(document.getElementById("stack")).toHaveTextContent("Is this a valid bracket sequence?");
    expect(document.getElementById("queue")).toHaveTextContent("How many requests are still recent?");
    expect(document.getElementById("queue")).toHaveTextContent("ping(1), ping(100), ping(3001), ping(3002)");
    expect(document.getElementById("queue")).toHaveTextContent("At most 10,000 calls");
    expect(document.getElementById("ranges")).toHaveTextContent("How can a stack return its minimum in O(1)?");
    expect(document.getElementById("ranges")).toHaveTextContent("push, pop, top, and getMin");
    expect(document.getElementById("ranges")).toHaveTextContent("at most 30,000 calls");
    expect(document.getElementById("ranges")).toHaveTextContent("Answers: 2, 2, 5");
    expect(screen.getByRole("link", { name: /Custom structure design/ })).toHaveAttribute("href", "#ranges");

    const links = [
      ["Official Codeforces 706B", "https://codeforces.com/problemset/problem/706/B"],
      ["Official LeetCode 20", "https://leetcode.com/problems/valid-parentheses/"],
      ["Official LeetCode 933", "https://leetcode.com/problems/number-of-recent-calls/"],
      ["Official Codeforces 443A", "https://codeforces.com/problemset/problem/443/A"],
      ["Official Codeforces 4C", "https://codeforces.com/problemset/problem/4/C"],
      ["Official LeetCode 155", "https://leetcode.com/problems/min-stack/"]
    ] as const;
    for (const [label, href] of links) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("rel", "noreferrer");
    }
    expect(screen.queryByText("Keep practicing")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Codeforces · Tales of a Sort" })).not.toBeInTheDocument();
  });

  it("separates a general tool lesson from an initially closed problem connection", () => {
    render(<DataStructuresPage />);

    const disclosures = screen.getAllByRole("button", { name: /Learn the tool/ });
    expect(disclosures).toHaveLength(7);
    expect(disclosures.every((button) => button.getAttribute("aria-expanded") === "false")).toBe(true);

    fireEvent.click(disclosures[0]!);
    expect(disclosures[0]).toHaveAttribute("aria-expanded", "true");
    const regionId = disclosures[0]!.getAttribute("aria-controls");
    expect(regionId).not.toBeNull();
    expect(document.getElementById(regionId!)).not.toHaveAttribute("hidden");
    expect(document.getElementById(regionId!)).toHaveTextContent("C++ number types are promises about range and precision");
    expect(document.getElementById(regionId!)).toHaveTextContent("long long");
    expect(document.getElementById(regionId!)).toHaveTextContent("−2⁶³ … 2⁶³−1");
    expect(document.getElementById(regionId!)).toHaveTextContent("about ±9 × 10¹⁸");
    expect(document.getElementById(regionId!)).toHaveTextContent("about ±2 × 10⁹");
    expect(document.getElementById(regionId!)).toHaveTextContent("0 to about 4 × 10⁹");
    expect(within(document.getElementById(regionId!)!).queryByRole("columnheader", { name: "Exactness / precision" })).not.toBeInTheDocument();
    expect(within(document.getElementById(regionId!)!).queryByText("Operations and cost")).not.toBeInTheDocument();
    expect(document.getElementById(regionId!)).not.toHaveTextContent("9,223,372,036,854,775,807");
    expect(within(document.getElementById(regionId!)!).queryByRole("rowheader", { name: "long" })).not.toBeInTheDocument();
    const connection = within(document.getElementById(regionId!)!).getByRole("button", { name: /Show the full solution explanation/ });
    expect(connection).toHaveAttribute("aria-expanded", "false");
    expect(document.body).not.toHaveTextContent("int main()");
    expect(document.body).not.toHaveTextContent("struct MinStack");
  });

  it("visualizes the bit capacity difference between a small product and overflow", () => {
    render(<DataStructuresPage />);
    const numeric = document.getElementById("numeric")!;
    const experiment = within(numeric).getByText("The same expression passes a small test and fails at scale");
    expect(experiment).not.toBeVisible();
    fireEvent.click(within(numeric).getByRole("button", { name: /Learn the tool/ }));
    expect(experiment).toBeVisible();
    expect(numeric).toHaveTextContent("int rows = 20");
    expect(numeric).toHaveTextContent("undefined behavior");
    expect(numeric).toHaveTextContent("Value bits required: 60");
    expect(numeric).toHaveTextContent("29 more value bits are needed.");
    expect(numeric).toHaveTextContent("30 + 30 → 60 bits");
    expect(numeric).toHaveTextContent("30 input bits");
    expect(numeric).toHaveTextContent("60 product bits");
    fireEvent.change(within(numeric).getByRole("textbox", { name: "First factor" }), { target: { value: "20" } });
    fireEvent.change(within(numeric).getByRole("textbox", { name: "Second factor" }), { target: { value: "30" } });
    expect(numeric).toHaveTextContent("600");
    expect(numeric).toHaveTextContent("Value bits required: 10");
    expect(numeric).toHaveTextContent("5 + 5 → 10 bits");
    expect(numeric).toHaveTextContent("The value fits.");
    fireEvent.change(within(numeric).getByRole("textbox", { name: "First factor" }), { target: { value: "1000000001" } });
    expect(numeric).toHaveTextContent("Enter a whole number from 0 to 1e9 in each field.");
    expect(within(numeric).queryByRole("radio")).not.toBeInTheDocument();
    expect(within(numeric).queryByRole("button", { name: /Check prediction/ })).not.toBeInTheDocument();
    expect(numeric).toHaveTextContent("Work out your own algorithm and write a first draft");
  });

  it("teaches vector sorting and both binary-search boundaries with interactive relation counts", () => {
    render(<DataStructuresPage />);
    const vector = document.getElementById("vector")!;
    fireEvent.click(within(vector).getByRole("button", { name: /Learn the tool/ }));

    expect(vector).toHaveTextContent("vector<int> values = {8, 3, 6, 1}");
    expect(within(vector).getByText("sort(begin, end)").closest("div")).toHaveTextContent("O(n log n)");
    expect(vector).toHaveTextContent("An iterator is a movable position inside a container");
    expect(vector).not.toHaveTextContent("Before binary search");
    expect(vector).toHaveTextContent("auto it = values.begin()");
    expect(vector).toHaveTextContent("++it");
    expect(vector).toHaveTextContent("cout << *it");
    expect(vector).toHaveTextContent("dereferencing *end() is invalid");
    expect(vector).toHaveTextContent("The search returns an iterator, not the answer count");
    expect(vector).toHaveTextContent("it - begin() → number of values before it");
    expect(within(vector).getByRole("button", { name: "Move the iterator one position left with --it" })).toBeDisabled();
    expect(vector).toHaveTextContent("it = begin() + 0, so *it = 4");
    fireEvent.click(within(vector).getByRole("button", { name: "Move the iterator one position right with ++it" }));
    expect(vector).toHaveTextContent("it = begin() + 1, so *it = 7");
    fireEvent.click(within(vector).getByRole("button", { name: "Move the iterator one position right with ++it" }));
    fireEvent.click(within(vector).getByRole("button", { name: "Move the iterator one position right with ++it" }));
    fireEvent.click(within(vector).getByRole("button", { name: "Move the iterator one position right with ++it" }));
    expect(vector).toHaveTextContent("it == end(); this position has no value");
    expect(within(vector).getByRole("button", { name: "Move the iterator one position right with ++it" })).toBeDisabled();
    fireEvent.click(within(vector).getByRole("button", { name: "Move the iterator one position left with --it" }));
    expect(vector).toHaveTextContent("it = begin() + 3, so *it = 12");
    fireEvent.click(within(vector).getByRole("button", { name: "Return to begin" }));
    expect(vector).toHaveTextContent("it = begin() + 0, so *it = 4");
    expect(within(vector).getByText("it - begin()").closest("div")).toHaveTextContent("O(1)");
    const iteratorTitle = within(vector).getByRole("heading", { name: "An iterator is a movable position inside a container" });
    const lowerBoundOperation = within(vector).getByText("lower_bound(...)");
    expect(iteratorTitle.compareDocumentPosition(lowerBoundOperation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(vector).toHaveTextContent("lower_bound");
    expect(vector).toHaveTextContent("upper_bound");
    expect(vector).toHaveTextContent("< 5 → 3");
    expect(vector).toHaveTextContent("≤ 5 → 3");
    expect(vector).toHaveTextContent("≥ 5 → 3");
    expect(vector).toHaveTextContent("> 5 → 3");

    fireEvent.click(within(vector).getByRole("button", { name: "3" }));
    expect(vector).toHaveTextContent("lower_bound(3) → 1");
    expect(vector).toHaveTextContent("upper_bound(3) → 3");
    expect(vector).toHaveTextContent("< 3 → 1");
    expect(vector).toHaveTextContent("≤ 3 → 3");
    expect(vector).not.toHaveTextContent("budget =");
  });

  it("explains generic container operations before offering problem-specific conceptual help", () => {
    render(<DataStructuresPage />);

    const stack = document.getElementById("stack")!;
    fireEvent.click(within(stack).getByRole("button", { name: /Learn the tool/ }));
    expect(stack).toHaveTextContent("push(value)");
    expect(stack).toHaveTextContent("Adds value to the top");
    expect(stack).toHaveTextContent("top()");
    expect(stack).toHaveTextContent("Calling it on an empty stack is invalid");
    expect(stack).toHaveTextContent("A stack works like a pile of books");
    expect(stack).toHaveTextContent("Dynamic programming");
    expect(within(stack).getByText("push(value)").closest("div")).toHaveTextContent("O(1)");
    const bookVisual = within(stack).getByRole("figure", { name: "A stack works like a pile of books" });
    expect(within(bookVisual).getByText("push(book)").closest("p")).toHaveTextContent("O(1)");
    expect(within(bookVisual).getByText("pop()", { exact: true }).closest("p")).toHaveTextContent("O(1)");
    const stackSimulator = within(stack).getByRole("region", { name: "Interactive stack simulator" });
    expect(stackSimulator).toHaveTextContent("stack<int> pile(deque<int>{2, 7, 4});");
    expect(within(stackSimulator).getByRole("region", { name: "Container state" })).toHaveTextContent(/4.*7.*2/);
    expect(within(stackSimulator).getByRole("button", { name: "empty()" })).toBeInTheDocument();
    expect(within(stackSimulator).getByRole("button", { name: "size()" })).toBeInTheDocument();
    expect(stack).not.toHaveTextContent("stack<char>");
    const stackConnection = within(stack).getByRole("button", { name: /Show the full solution explanation/ });
    expect(stackConnection).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(stackConnection);
    expect(within(stack).getByRole("heading", { name: "Solution" })).toBeVisible();
    expect(within(stack).queryByRole("heading", { name: "Main idea" })).not.toBeInTheDocument();
    expect(stack).not.toHaveTextContent("Represent the problem");
    expect(stack).not.toHaveTextContent("Run the idea");
    expect(stack).not.toHaveTextContent("Why it works");
    expect(stack).toHaveTextContent("only opening symbols that still need a partner");
    expect(stack).toHaveTextContent("each opening is pushed and popped at most once");
    expect(stack).not.toHaveTextContent("for (char");

    const queue = document.getElementById("queue")!;
    fireEvent.click(within(queue).getByRole("button", { name: /Learn the tool/ }));
    expect(queue).toHaveTextContent("front()");
    expect(queue).toHaveTextContent("Reads the oldest waiting value");
    const queueSimulator = within(queue).getByRole("region", { name: "Interactive queue simulator" });
    expect(queueSimulator).toHaveTextContent("queue<int> line(deque<int>{12, 24, 36});");
    expect(within(queueSimulator).getByRole("button", { name: "front()" })).toBeInTheDocument();
    expect(within(queueSimulator).getByRole("button", { name: "size()" })).toBeInTheDocument();
    expect(queue).toHaveTextContent("deque: a sequence open at both ends");
    expect(queue).toHaveTextContent("push_front(value)");
    expect(queue).toHaveTextContent("A deque is special at its ends, not in its middle");
    const dequeSimulator = within(queue).getByRole("region", { name: "Interactive deque simulator" });
    expect(dequeSimulator).toHaveTextContent("deque<int> deck = {3, 8, 13};");
    expect(within(dequeSimulator).getByRole("button", { name: "push_front(number)" })).toBeInTheDocument();

    const reference = document.getElementById("reference")!;
    expect(reference).toHaveTextContent("unordered_set");
    expect(reference).toHaveTextContent("avg. / O(n) worst");
    expect(reference).toHaveTextContent("N/A");
    expect(reference).toHaveTextContent("What each structure stores and the operations you will reach for");
    expect(reference).toHaveTextContent("vector<T>");
    expect(reference).toHaveTextContent("stack<T>");
    expect(reference).toHaveTextContent("struct Name");
    expect(reference).toHaveTextContent("Complexity comparison");
  });

  it("keeps the first solution text-only and gives the other problems controllable walkthroughs without solution code", () => {
    render(<DataStructuresPage />);

    const expectations = [
      ["numeric", "largest intermediate value: 10⁹ × 10⁹ = 10¹⁸", "fixed number of primitive operations"],
      ["vector", "Sorting [3, 10, 8, 6] gives [3, 6, 8, 10]", "Scanning every shop for every customer would cost O(nq)"],
      ["stack", "only opening symbols that still need a partner", "string containing only openings"],
      ["queue", "oldest is always at front()", "those removals never repeat"],
      ["set", "braces, commas, and spaces are formatting", "Space is bounded by O(26)"],
      ["map", "stored value for that name is the suffix", "costs O(log m)"],
      ["ranges", "(value, minimum so far)", "Each operation does a constant amount of work"]
    ] as const;

    for (const [id, ideaDetail, costDetail] of expectations) {
      const section = document.getElementById(id)!;
      fireEvent.click(within(section).getByRole("button", { name: /Learn the tool/ }));
      const reveal = within(section).getByRole("button", { name: /Show the full solution explanation/ });
      fireEvent.click(reveal);

      expect(reveal).toHaveAttribute("aria-expanded", "true");
      expect(within(section).getByRole("heading", { name: "Solution" })).toBeVisible();
      expect(within(section).queryByRole("heading", { name: "Main idea" })).not.toBeInTheDocument();
      expect(within(section).queryByText("Represent the problem")).not.toBeInTheDocument();
      expect(within(section).queryByText("Run the idea")).not.toBeInTheDocument();
      expect(within(section).queryByText("Why it works")).not.toBeInTheDocument();
      if (id === "numeric") {
        expect(within(section).queryByRole("region", { name: /Walk through the algorithm:/ })).not.toBeInTheDocument();
        expect(within(section).queryByRole("button", { name: "Play animation" })).not.toBeInTheDocument();
        expect(within(section).queryByRole("button", { name: "Next step" })).not.toBeInTheDocument();
      } else {
        expect(within(section).getByRole("region", { name: /Walk through the algorithm:/ })).toBeVisible();
        expect(within(section).getByRole("button", { name: "Play animation" })).toBeVisible();
        expect(within(section).getByRole("button", { name: "Next step" })).toBeVisible();
      }
      expect(section).toHaveTextContent("Read the idea, follow how it processes the sample");
      expect(section).not.toHaveTextContent("play the walkthrough");
      expect(section).toHaveTextContent(ideaDetail);
      expect(section).toHaveTextContent(costDetail);

      const solutionId = reveal.getAttribute("aria-controls");
      const solution = solutionId === null ? null : document.getElementById(solutionId);
      expect(solution).not.toBeNull();
      expect(solution!.querySelector("pre")).toBeNull();
      expect(solution!.querySelector("code")).toBeNull();
    }

    expect(document.body).not.toHaveTextContent("int main()");
    expect(document.body).not.toHaveTextContent("struct MinStack");
    expect(document.getElementById("vector")).toHaveTextContent("Subtracting begin() gives 0, 2, 3, and 4 shops");
    expect(document.getElementById("vector")).toHaveTextContent("the distance from begin() is exactly the affordable prefix length");
  });

  it("offers the same first-solution-only exception in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(<DataStructuresPage />);

    const expectations = [
      ["numeric", "mayor valor intermedio: 10⁹ × 10⁹ = 10¹⁸", "cantidad fija de operaciones primitivas"],
      ["vector", "Después de ordenar [3, 10, 8, 6] obtienes [3, 6, 8, 10]", "Revisar todas las tiendas para cada cliente costaría O(nq)"],
      ["stack", "solamente los símbolos de apertura que todavía esperan pareja", "cadena formada solo por aperturas"],
      ["queue", "más antiguo siempre está en front()", "esas retiradas no se repiten"],
      ["set", "llaves, comas y espacios son solo formato", "espacio está limitado a O(26)"],
      ["map", "valor guardado para ese nombre es el número", "cuesta O(log m)"],
      ["ranges", "(valor, mínimo hasta aquí)", "cantidad constante de trabajo"]
    ] as const;

    for (const [id, ideaDetail, costDetail] of expectations) {
      const section = document.getElementById(id)!;
      fireEvent.click(within(section).getByRole("button", { name: /Aprender la herramienta/ }));
      const reveal = within(section).getByRole("button", { name: /Mostrar la solución explicada completa/ });
      fireEvent.click(reveal);

      expect(reveal).toHaveAttribute("aria-expanded", "true");
      expect(within(section).getByRole("heading", { name: "Solución" })).toBeVisible();
      expect(within(section).queryByRole("heading", { name: "Idea principal" })).not.toBeInTheDocument();
      expect(within(section).queryByText("Representa el problema")).not.toBeInTheDocument();
      expect(within(section).queryByText("Ejecuta la idea")).not.toBeInTheDocument();
      expect(within(section).queryByText("Por qué funciona")).not.toBeInTheDocument();
      if (id === "numeric") {
        expect(within(section).queryByRole("region", { name: /Recorre el algoritmo:/ })).not.toBeInTheDocument();
        expect(within(section).queryByRole("button", { name: "Reproducir animación" })).not.toBeInTheDocument();
        expect(within(section).queryByRole("button", { name: "Siguiente paso" })).not.toBeInTheDocument();
      } else {
        expect(within(section).getByRole("region", { name: /Recorre el algoritmo:/ })).toBeVisible();
        expect(within(section).getByRole("button", { name: "Reproducir animación" })).toBeVisible();
        expect(within(section).getByRole("button", { name: "Siguiente paso" })).toBeVisible();
      }
      expect(section).toHaveTextContent("Lee la idea, sigue cómo procesa el ejemplo");
      expect(section).not.toHaveTextContent("reproduce el recorrido");
      expect(section).toHaveTextContent(ideaDetail);
      expect(section).toHaveTextContent(costDetail);
    }

    expect(document.body).not.toHaveTextContent("int main()");
    expect(document.body).not.toHaveTextContent("struct MinStack");
    expect(document.getElementById("vector")).toHaveTextContent("Al restar begin() obtienes 0, 2, 3 y 4 tiendas");
    expect(document.getElementById("vector")).toHaveTextContent("la distancia desde begin() mide exactamente la longitud del prefijo asequible");
  });

  it("lets the learner change inputs in each remaining solution walkthrough", () => {
    render(<DataStructuresPage />);

    const openWalkthrough = (sectionId: string) => {
      const section = document.getElementById(sectionId)!;
      fireEvent.click(within(section).getByRole("button", { name: /Learn the tool/ }));
      fireEvent.click(within(section).getByRole("button", { name: /Show the full solution explanation/ }));
      const element = within(section).getByRole("region", { name: /Walk through the algorithm:/ });
      return Object.assign(within(element), { element });
    };

    const vectorWalkthrough = openWalkthrough("vector");
    fireEvent.change(vectorWalkthrough.getByRole("textbox", { name: "Shop prices" }), { target: { value: "5, 1, 4" } });
    fireEvent.change(vectorWalkthrough.getByRole("textbox", { name: "Budget queries" }), { target: { value: "0, 4, 9" } });
    expect(vectorWalkthrough.element).toHaveTextContent("Original order");
    fireEvent.click(vectorWalkthrough.getByRole("button", { name: "Next step" }));
    expect(vectorWalkthrough.element).toHaveTextContent("Move 1 into the next sorted position");
    for (let step = 0; step < 7; step += 1) {
      fireEvent.click(vectorWalkthrough.getByRole("button", { name: "Next step" }));
    }
    expect(vectorWalkthrough.element).toHaveTextContent("Answers: 0, 2, 3");

    const stackWalkthrough = openWalkthrough("stack");
    const sequence = stackWalkthrough.getByRole("textbox", { name: "Bracket sequence" });
    fireEvent.change(sequence, { target: { value: "([)]" } });
    expect(stackWalkthrough.element).toHaveTextContent("No symbols processed yet");
    fireEvent.click(stackWalkthrough.getByRole("button", { name: "Next step" }));
    expect(stackWalkthrough.element).toHaveTextContent("Push ( onto the stack");
    fireEvent.click(stackWalkthrough.getByRole("button", { name: "Next step" }));
    fireEvent.click(stackWalkthrough.getByRole("button", { name: "Next step" }));
    expect(stackWalkthrough.getByText("Invalid sequence")).toBeInTheDocument();
    expect(stackWalkthrough.getByText("Expected ] but received ).")).toBeInTheDocument();

    const queueWalkthrough = openWalkthrough("queue");
    fireEvent.change(queueWalkthrough.getByRole("textbox", { name: "Ping times" }), { target: { value: "1, 100, 3001, 3002" } });
    for (let step = 0; step < 4; step += 1) {
      fireEvent.click(queueWalkthrough.getByRole("button", { name: "Next step" }));
    }
    expect(queueWalkthrough.element).toHaveTextContent("Remove 1 because it is older than 2");
    expect(queueWalkthrough.element).toHaveTextContent("Queue: 100, 3001, 3002");

    const setWalkthrough = openWalkthrough("set");
    fireEvent.change(setWalkthrough.getByRole("textbox", { name: "Formatted set" }), { target: { value: "{z, z, a}" } });
    const setNext = setWalkthrough.getByRole("button", { name: "Next step" }) as HTMLButtonElement;
    while (!setNext.disabled) fireEvent.click(setNext);
    expect(setWalkthrough.element).toHaveTextContent("2 distinct letters");
    expect(setWalkthrough.element).toHaveTextContent("Distinct-letter count: 2");

    const mapWalkthrough = openWalkthrough("map");
    fireEvent.change(mapWalkthrough.getByRole("textbox", { name: "Username requests" }), { target: { value: "ana, bob, ana" } });
    fireEvent.click(mapWalkthrough.getByRole("button", { name: "Next step" }));
    expect(mapWalkthrough.element).toHaveTextContent("ana is new: answer OK and store count 1");
    fireEvent.click(mapWalkthrough.getByRole("button", { name: "Next step" }));
    fireEvent.click(mapWalkthrough.getByRole("button", { name: "Next step" }));
    expect(mapWalkthrough.getByText("OK, OK, ana1")).toBeInTheDocument();

    const rangesWalkthrough = openWalkthrough("ranges");
    fireEvent.change(rangesWalkthrough.getByRole("textbox", { name: "MinStack operations" }), {
      target: { value: "push(5), push(2), push(-5), getMin(), pop(), top()" }
    });
    fireEvent.click(rangesWalkthrough.getByRole("button", { name: "Next step" }));
    expect(rangesWalkthrough.element).toHaveTextContent("Push 5 and store (5, 5)");
    fireEvent.click(rangesWalkthrough.getByRole("button", { name: "Next step" }));
    fireEvent.click(rangesWalkthrough.getByRole("button", { name: "Next step" }));
    expect(rangesWalkthrough.element).toHaveTextContent("(-5, -5)");
    fireEvent.click(rangesWalkthrough.getByRole("button", { name: "Next step" }));
    expect(rangesWalkthrough.element).toHaveTextContent("getMin → -5");
  });

  it("plays, pauses, and replays a remaining walkthrough", () => {
    vi.useFakeTimers();
    try {
      render(<DataStructuresPage />);
      const vector = document.getElementById("vector")!;
      fireEvent.click(within(vector).getByRole("button", { name: /Learn the tool/ }));
      fireEvent.click(within(vector).getByRole("button", { name: /Show the full solution explanation/ }));
      const walkthrough = within(vector).getByRole("region", { name: /Walk through the algorithm:/ });
      const controls = within(walkthrough);
      const progress = controls.getByRole("progressbar", { name: "Walkthrough progress" });

      fireEvent.click(controls.getByRole("button", { name: "Play animation" }));
      act(() => vi.advanceTimersByTime(850));
      expect(progress).toHaveAttribute("aria-valuenow", "2");

      fireEvent.click(controls.getByRole("button", { name: "Pause animation" }));
      act(() => vi.advanceTimersByTime(1_700));
      expect(progress).toHaveAttribute("aria-valuenow", "2");

      const next = controls.getByRole("button", { name: "Next step" }) as HTMLButtonElement;
      while (!next.disabled) fireEvent.click(next);
      fireEvent.click(controls.getByRole("button", { name: "Play animation" }));
      expect(progress).toHaveAttribute("aria-valuenow", "1");
      fireEvent.click(controls.getByRole("button", { name: "Pause animation" }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("places operation costs beside the operations and teaches ordered, hashed, and custom structures", () => {
    render(<DataStructuresPage />);

    const setSection = document.getElementById("set")!;
    fireEvent.click(within(setSection).getByRole("button", { name: /Learn the tool/ }));
    expect(setSection).toHaveTextContent("count(value)");
    expect(setSection).not.toHaveTextContent("find(value)");
    expect(setSection).toHaveTextContent("lower_bound(value)");
    expect(setSection).toHaveTextContent("upper_bound(value)");
    expect(within(setSection).getByText("count(value)").closest("div")).toHaveTextContent("O(log n)");
    expect(setSection).toHaveTextContent("unordered_set<T>");
    expect(setSection).toHaveTextContent("O(1) average · O(n) worst case");
    expect(setSection).toHaveTextContent("provides no lower_bound or upper_bound");

    const mapSection = document.getElementById("map")!;
    fireEvent.click(within(mapSection).getByRole("button", { name: /Learn the tool/ }));
    expect(mapSection).toHaveTextContent("count(key)");
    expect(within(mapSection).getByText("emplace(key, value)", { selector: "dt" }).closest("div")).toHaveTextContent("keeps its current value");
    expect(mapSection).toHaveTextContent("lower_bound(key)");
    expect(mapSection).toHaveTextContent("upper_bound(key)");
    expect(mapSection).not.toHaveTextContent("find(key)");
    expect(mapSection).not.toHaveTextContent("insert_or_assign");
    expect(mapSection).not.toHaveTextContent(/\.find\s*\(/);
    const mapSimulator = within(mapSection).getByRole("region", { name: "Interactive map simulator" });
    expect(mapSimulator).toHaveTextContent("map<int, int> scores = {{1, 10}, {3, 30}, {7, 70}};");
    expect(within(mapSimulator).getByRole("button", { name: "emplace(key, value)" })).toBeInTheDocument();
    expect(within(mapSimulator).getByRole("button", { name: "lower_bound(key)" })).toBeInTheDocument();
    expect(within(mapSimulator).getByRole("button", { name: "upper_bound(key)" })).toBeInTheDocument();
    expect(within(mapSimulator).getByRole("button", { name: "size()" })).toBeInTheDocument();
    expect(within(mapSimulator).getByRole("button", { name: "erase(key)" })).toBeInTheDocument();
    expect(mapSection).toHaveTextContent("map and unordered_map: values addressed by keys");
    expect(mapSection).toHaveTextContent("unordered_map<K, V>");
    expect(mapSection).toHaveTextContent("frequencies[\"red\"]++");
    expect(mapSection).toHaveTextContent("O(1) average · O(n) worst case");
    expect(mapSection).toHaveTextContent("has no lower_bound or upper_bound");

    const rangesSection = document.getElementById("ranges")!;
    fireEvent.click(within(rangesSection).getByRole("button", { name: /Learn the tool/ }));
    expect(rangesSection).toHaveTextContent("Designing your own structure from rules");
    expect(rangesSection).toHaveTextContent("Four decisions for designing the structure");
    expect(rangesSection).toHaveTextContent("Choose the minimum state");
    expect(rangesSection).toHaveTextContent("struct Counter");
    expect(rangesSection).toHaveTextContent("Counter visits");
    expect(rangesSection).toHaveTextContent("visits.add(3)");
    expect(rangesSection).toHaveTextContent("This neutral counter demonstrates the syntax without implementing MinStack");
    expect(rangesSection).toHaveTextContent("List only the fields an object must remember");
    expect(within(rangesSection).getByText("add(amount)").closest("div")).toHaveTextContent("O(1)");
    expect(rangesSection).not.toHaveTextContent("addLowerBound(x)");
    expect(rangesSection).not.toHaveTextContent("countAllowed()");
    expect(rangesSection).not.toHaveTextContent("struct MinStack");
    expect(within(rangesSection).getByRole("region", { name: "Interactive a Counter struct simulator" })).toHaveTextContent("Counter visits");

    fireEvent.click(within(setSection).getByRole("button", { name: /Show the full solution explanation/ }));
    expect(setSection).not.toHaveTextContent("This is a direction, not answer code");
  });

  it("localizes prose, narration, controls, and C++ identifiers with equivalent traces", async () => {
    const { rerender } = render(<DataStructuresPage />);

    await i18n.changeLanguage("es");
    rerender(<DataStructuresPage />);

    expect(screen.getByRole("heading", { name: "Deja que el problema pida la estructura." })).toBeInTheDocument();
    const vectorSection = document.getElementById("vector")!;
    fireEvent.click(within(vectorSection).getByRole("button", { name: /Aprender la herramienta/ }));
    expect(vectorSection).toHaveTextContent("vector<int> valores");
    expect(vectorSection).toHaveTextContent("Un iterador es una posición que se puede mover dentro de un contenedor");
    expect(vectorSection).toHaveTextContent("auto it = valores.begin()");
    expect(vectorSection).toHaveTextContent("La búsqueda devuelve un iterador, no la cantidad de la respuesta");
    fireEvent.click(within(vectorSection).getByRole("button", { name: "Mover el iterador una posición a la derecha con ++it" }));
    expect(vectorSection).toHaveTextContent("it = begin() + 1, así que *it = 7");
    expect(vectorSection).toHaveTextContent("¿Dónde caen lower_bound y upper_bound?");
    expect(screen.getAllByRole("button", { name: /(Aprender la herramienta|Ocultar la lección de la herramienta)/ })).toHaveLength(7);
    expect(document.getElementById("numeric")).toHaveTextContent("int filas = 20");
    expect(document.getElementById("numeric")).toHaveTextContent("Los tipos numéricos de C++ son promesas");
    expect(document.getElementById("numeric")).toHaveTextContent("Rango como potencia de dos");
    expect(document.getElementById("numeric")).toHaveTextContent("aprox. ±2 × 10⁹");
    expect(document.getElementById("numeric")).toHaveTextContent("de 0 a aprox. 4 × 10⁹");
    expect(within(document.getElementById("numeric")!).getByRole("img", { name: "3 filas por 4 columnas: 12 celdas pintadas" })).toBeInTheDocument();
    expect(document.getElementById("set")).toHaveTextContent("Solo las letras minúsculas son datos");
    expect(document.getElementById("stack")).toHaveTextContent("¿Es una secuencia válida de paréntesis?");
    expect(document.getElementById("queue")).toHaveTextContent("¿Cuántas solicitudes siguen siendo recientes?");

    const stackSection = document.getElementById("stack")!;
    fireEvent.click(within(stackSection).getByRole("button", { name: /Aprender la herramienta/ }));
    expect(stackSection).toHaveTextContent("Una pila funciona como libros apilados");
    expect(within(stackSection).getByText("push(value)").closest("div")).toHaveTextContent("O(1)");
    fireEvent.click(within(stackSection).getByRole("button", { name: /Mostrar la solución explicada completa/ }));
    expect(within(stackSection).getByRole("heading", { name: "Solución" })).toBeVisible();
    expect(within(stackSection).queryByRole("heading", { name: "Idea principal" })).not.toBeInTheDocument();
    expect(stackSection).not.toHaveTextContent("Representa el problema");
    expect(stackSection).not.toHaveTextContent("Por qué funciona");
    const spanishStackWalkthrough = within(stackSection).getByRole("region", { name: /Recorre el algoritmo:/ });
    fireEvent.change(within(spanishStackWalkthrough).getByRole("textbox", { name: "Secuencia de paréntesis" }), {
      target: { value: "" }
    });
    expect(spanishStackWalkthrough).toHaveTextContent("Escribe al menos un paréntesis.");

    const queueSection = document.getElementById("queue")!;
    fireEvent.click(within(queueSection).getByRole("button", { name: /Aprender la herramienta/ }));
    expect(queueSection).toHaveTextContent("deque: una secuencia abierta por ambos extremos");
    expect(within(queueSection).getByRole("region", { name: "Simulador interactivo de queue" })).toHaveTextContent("queue<int> fila(deque<int>{12, 24, 36});");

    const rangesSection = document.getElementById("ranges")!;
    fireEvent.click(within(rangesSection).getByRole("button", { name: /Aprender la herramienta/ }));
    expect(rangesSection).toHaveTextContent("struct Contador");
    expect(rangesSection).toHaveTextContent("Contador visitas");
    expect(document.getElementById("ranges")).toHaveTextContent("¿Cómo puede una pila devolver su mínimo en O(1)?");
    expect(document.getElementById("ranges")).toHaveTextContent("máximo 30.000 llamadas");
    expect(screen.getByRole("link", { name: /Diseño de estructuras propias/ })).toHaveAttribute("href", "#ranges");

    const mapSection = document.getElementById("map")!;
    fireEvent.click(within(mapSection).getByRole("button", { name: /Aprender la herramienta/ }));
    expect(mapSection).toHaveTextContent("map y unordered_map: valores identificados por claves");
    expect(mapSection).toHaveTextContent("unordered_map<string, int> frecuencias");
    fireEvent.click(within(mapSection).getByRole("button", { name: /Mostrar la solución explicada completa/ }));
    const spanishMapWalkthrough = within(mapSection).getByRole("region", { name: /Recorre el algoritmo:/ });
    fireEvent.change(within(spanishMapWalkthrough).getByRole("textbox", { name: "Solicitudes de nombres" }), {
      target: { value: "" }
    });
    expect(spanishMapWalkthrough).toHaveTextContent("Cada solicitud debe contener entre 1 y 32 letras minúsculas.");
  });
});
