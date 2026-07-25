import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import { ProgrammingFundamentalsPage } from "./ProgrammingFundamentalsPage.js";

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "learner-one" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));
vi.mock("./useLearningProgress.js", () => ({
  useLearningProgress: () => ({ data: [] }),
  useStartLearningGuide: () => ({ mutate: vi.fn() }),
  useSetLearningProgressStatus: () => ({ mutate: vi.fn(), isPending: false })
}));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ success: vi.fn(), error: vi.fn() }) }));

class ObserverStub {
  observe(): void {}
  disconnect(): void {}
}

describe("ProgrammingFundamentalsPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("opens with three practical programming self-checks and explains a not-yet answer", () => {
    render(<ProgrammingFundamentalsPage />);

    const selfCheck = screen.getByRole("region", { name: "Could you program these today?" });
    expect(within(selfCheck).getAllByRole("group")).toHaveLength(3);
    expect(within(selfCheck).getByRole("heading", { name: "Validate a Sudoku board" })).toBeInTheDocument();
    expect(within(selfCheck).getByRole("heading", { name: "Check whether a password is strong" })).toBeInTheDocument();
    expect(within(selfCheck).getByRole("heading", { name: "Find the deepest nested folder" })).toBeInTheDocument();
    const challengeImages = Array.from(selfCheck.querySelectorAll("img"));
    expect(challengeImages.map((image) => image.getAttribute("src"))).toEqual([
      "/learning/fundamentals/sudoku-iteration.webp",
      "/learning/fundamentals/password-conditionals.webp",
      "/learning/fundamentals/folders-recursion.webp"
    ]);
    expect(challengeImages.every((image) => image.getAttribute("loading") === "eager")).toBe(true);
    expect(within(selfCheck).getByRole("link", { name: "LeetCode 36 · Valid Sudoku" })).toHaveAttribute(
      "href",
      "https://leetcode.com/problems/valid-sudoku/"
    );
    expect(within(selfCheck).getByRole("link", { name: "LeetCode 2299 · Strong Password Checker II" })).toHaveAttribute(
      "href",
      "https://leetcode.com/problems/strong-password-checker-ii/"
    );
    expect(within(selfCheck).getByRole("link", { name: "LeetCode 559 · Maximum Depth of N-ary Tree" })).toHaveAttribute(
      "href",
      "https://leetcode.com/problems/maximum-depth-of-n-ary-tree/"
    );
    expect(within(selfCheck).getByText("Iteration")).toBeInTheDocument();
    expect(within(selfCheck).getByText("Conditionals")).toBeInTheDocument();
    expect(within(selfCheck).getByText("Recursion")).toBeInTheDocument();

    fireEvent.click(within(selfCheck).getAllByRole("button", { name: "Not yet" })[0]!);

    expect(within(selfCheck).getByText(/Until you can combine the fundamentals into small programs like these/)).toBeInTheDocument();
    expect(within(selfCheck).getAllByRole("button", { pressed: true })).toHaveLength(1);

    fireEvent.click(within(selfCheck).getAllByRole("button", { name: "Yes, I could" })[0]!);

    expect(within(selfCheck).getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(within(selfCheck).getAllByRole("button", { name: "Yes, I could" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(within(selfCheck).getAllByRole("button", { name: "Not yet" })[0]).toHaveAttribute("aria-pressed", "false");
    expect(within(selfCheck).getByText(/Answer each one honestly/)).toBeInTheDocument();
  });

  it("recognizes when the learner could program all three tasks", () => {
    render(<ProgrammingFundamentalsPage />);

    const selfCheck = screen.getByRole("region", { name: "Could you program these today?" });
    for (const button of within(selfCheck).getAllByRole("button", { name: "Yes, I could" })) {
      fireEvent.click(button);
    }

    expect(within(selfCheck).getByText(/you already know how to use the fundamentals/)).toBeInTheDocument();
    expect(within(selfCheck).getAllByRole("button", { pressed: true })).toHaveLength(3);
  });

  it("explains binary representation, separates operator concepts, and outlines truth-table cells", () => {
    render(<ProgrammingFundamentalsPage />);

    expect(screen.getByRole("heading", { name: "Why computers use bits" })).toBeInTheDocument();
    const researchLinks = [
      ["bool: Boolean data type", "https://en.wikipedia.org/wiki/Boolean_data_type"],
      ["int: Integer representation", "https://en.wikipedia.org/wiki/Integer_(computer_science)"],
      ["double: Floating-point arithmetic", "https://en.wikipedia.org/wiki/Floating-point_arithmetic"],
      ["char: Character encoding", "https://en.wikipedia.org/wiki/Character_encoding"]
    ] as const;
    for (const [name, href] of researchLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
      expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
    }

    expect(screen.getByRole("heading", { name: "Built-in C++ operators" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What happens when different types meet?" })).toBeInTheDocument();
    for (const operation of ["Addition", "Subtraction", "Multiplication", "Division", "Remainder"]) {
      expect(screen.getByText(operation)).toBeInTheDocument();
    }
    const operatorReference = screen.getByRole("list", { name: "C++ arithmetic operator reference" });
    expect(Array.from(operatorReference.querySelectorAll("code")).map((code) => code.textContent)).toEqual(["+", "-", "*", "/", "%"]);
    expect(screen.getByText("5 % 2 = 1")).toBeInTheDocument();
    expect(screen.getByText(/amount left over after whole-number division/)).toBeInTheDocument();

    const conversionExamples = screen.getByRole("region", { name: "Type conversion examples" });
    for (const example of [
      "double score = solved + bonus;",
      "int next_code = category + 1;",
      "int whole_score = int(score);",
      "bool qualifies = score >= 5;"
    ]) {
      expect(conversionExamples).toHaveTextContent(example);
    }

    const truthTables = [
      "Truth table for AND with A on the vertical axis and B on the horizontal axis",
      "Truth table for OR with A on the vertical axis and B on the horizontal axis",
      "Truth table for NOT"
    ].map((caption) => screen.getByText(caption).closest("table"));
    expect(truthTables).toHaveLength(3);
    for (const table of truthTables) {
      expect(table).not.toBeNull();
      const cells = Array.from(table!.querySelectorAll("th, td"));
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.every((cell) => cell.classList.contains("border"))).toBe(true);
      expect(cells.every((cell) => cell.classList.contains("border-zinc-500"))).toBe(true);
    }
  });

  it("uses a multi-step function trace and compares early return with a helper variable", () => {
    render(<ProgrammingFundamentalsPage />);

    const functionTrace = screen.getByLabelText("Function call code trace");
    expect(functionTrace).toHaveTextContent("int calculate_score(int solved, int penalty)");
    expect(functionTrace).toHaveTextContent("score -= 50;");
    expect(functionTrace).toHaveTextContent("calculate_score(3, 75)");

    expect(screen.getByRole("heading", { name: "Return as soon as the answer is known" })).toBeInTheDocument();
    const comparison = screen.getByRole("region", { name: "Early return comparison" });
    expect(within(comparison).getByRole("heading", { name: "With early returns" })).toBeInTheDocument();
    expect(within(comparison).getByRole("heading", { name: "With a helper variable" })).toBeInTheDocument();
    expect(comparison).toHaveTextContent('return "invalid";');
    expect(comparison).toHaveTextContent("string result;");
  });

  it("ends with text input and output, including a four-question practice set with code-block inputs", () => {
    render(<ProgrammingFundamentalsPage />);

    const guideSections = Array.from(document.querySelectorAll("main section[id]"));
    expect(guideSections.at(-1)).toHaveAttribute("id", "entrada-salida");
    expect(screen.getByRole("heading", { name: "Reading and outputting text" })).toBeInTheDocument();
    expect(screen.getByText("Text input and output")).toBeInTheDocument();

    const streams = screen.getByRole("region", { name: "C++ standard input and output streams" });
    expect(streams).toHaveTextContent("cin >> value");
    expect(streams).toHaveTextContent("cout << value");
    expect(screen.getByRole("heading", { name: "Read one word" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Read a whole line" })).toBeInTheDocument();
    expect(screen.getByText("getline(cin >> ws, line);")).toBeInTheDocument();
    expect(document.getElementById("entrada-salida")).toHaveTextContent("getline(cin, name)");

    const section = document.getElementById("entrada-salida");
    expect(section).not.toBeNull();
    const practice = within(section!).getByText("Question 1 of 4").closest<HTMLElement>("div.my-10");
    expect(practice).not.toBeNull();
    expect(within(practice!).getByLabelText("Question input")).toHaveTextContent("Ada Lovelace");

    const nextQuestion = within(practice!).getByRole("button", { name: "Next question" });
    fireEvent.click(nextQuestion);
    expect(within(practice!).getByText("Question 2 of 4")).toBeInTheDocument();
    expect(within(practice!).getByLabelText("Question input")).toHaveTextContent("Ada Lovelace");
    expect(practice).toHaveTextContent("cin >> name");

    fireEvent.click(nextQuestion);
    expect(within(practice!).getByText("Question 3 of 4")).toBeInTheDocument();
    const multilineInput = within(practice!).getByLabelText("Question input");
    expect(
      Array.from(multilineInput.querySelectorAll("[data-guide-line]"))
        .map((line) => line.lastElementChild?.textContent)
    ).toEqual(["3", "Binary Searchers"]);
    expect(practice).toHaveTextContent("getline(cin >> ws, team)");

    fireEvent.click(nextQuestion);
    expect(within(practice!).getByText("Question 4 of 4")).toBeInTheDocument();
    expect(within(practice!).getByLabelText("Question input")).toHaveTextContent("Ada Lovelace");
    expect(practice).toHaveTextContent("cin >> first_name >> last_name");
  });

  it("uses Spanish research destinations and labels when the lesson is in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(<ProgrammingFundamentalsPage />);

    expect(screen.getByRole("heading", { name: "Por qué las computadoras usan bits" })).toBeInTheDocument();
    const spanishResearchLinks = [
      ["bool: Tipo de dato lógico", "https://es.wikipedia.org/wiki/Tipo_de_dato_l%C3%B3gico"],
      ["int: Representación de enteros", "https://es.wikipedia.org/wiki/Tipo_de_dato_entero"],
      ["double: Coma flotante", "https://es.wikipedia.org/wiki/Coma_flotante"],
      ["char: Codificación de caracteres", "https://es.wikipedia.org/wiki/Car%C3%A1cter_(tipo_de_dato)"]
    ] as const;
    for (const [name, href] of spanishResearchLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("heading", { name: "Operadores incorporados de C++" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Qué ocurre cuando se encuentran tipos distintos?" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Controles interactivos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Leer y mostrar texto" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Flujos de entrada y salida estándar de C++" })).toBeInTheDocument();
  });
});
