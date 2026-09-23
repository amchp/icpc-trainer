import "../i18n/registerAnimationResources.js";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { AnimationLessonIntro } from "./AnimationLessonIntro.js";

// The statement illustration must teach an outcome without driving the algorithm player.
afterEach(cleanup);

describe("lesson introductions", () => {
  it("shows a concrete permutation task and reveals all six distinct orderings", async () => {
    await i18n.changeLanguage("en");
    render(<AnimationLessonIntro groupId="permutations" />);
    expect(screen.getByRole("heading", { name: "Generate every ordering" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Three items: A, B, C." })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show example outcome" }));
    const illustration = screen.getByRole("img", { name: /There are 3! = 6 orderings/ });
    for (const ordering of ["ABC", "ACB", "BAC", "BCA", "CAB", "CBA"]) {
      expect(within(illustration).getByText(ordering, { exact: true })).toBeVisible();
    }
    fireEvent.click(screen.getByRole("button", { name: "Back to input" }));
    expect(screen.getByRole("img", { name: "Three items: A, B, C." })).toBeVisible();
  });

  it("labels a stack as operations to explore and keeps the top above earlier values", async () => {
    await i18n.changeLanguage("en");
    render(<AnimationLessonIntro groupId="stacks" />);
    expect(screen.getByText("01 · Operations to explore")).toBeVisible();
    const illustration = screen.getByRole("img");
    expect([...illustration.children].map((node) => node.textContent)).toEqual(["4", "7", "2"]);
    fireEvent.click(screen.getByRole("button", { name: "Show example outcome" }));
    expect(illustration.firstElementChild).toHaveTextContent("top() → 4");
  });

  it("explains BFS distances in Spanish with an accessible graph", async () => {
    await i18n.changeLanguage("es");
    render(<AnimationLessonIntro groupId="bfs" />);
    expect(screen.getByRole("heading", { name: "Encuentra distancias cuando cada paso cuesta uno" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar el resultado del ejemplo" }));
    expect(screen.getByRole("img", { name: /D tiene distancia 2/ })).toHaveTextContent("D: 2");
    expect(screen.getByRole("status")).toHaveTextContent("A tiene distancia 0");
  });

  it("treats Fibonacci's tree as analysis, not a different algorithm problem", async () => {
    await i18n.changeLanguage("en");
    render(<AnimationLessonIntro groupId="fibonacci-recursion-tree" />);
    expect(screen.getByText("01 · The analysis question")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Count repeated work" })).toBeVisible();
  });
});
