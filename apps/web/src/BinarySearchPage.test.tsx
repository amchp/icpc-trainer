import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "./i18n/i18n.js";
import "./i18n/registerBinarySearchResources.js";
import { BinarySearchPage } from "./BinarySearchPage.js";

const progressState = vi.hoisted(() => ({ start: vi.fn(), setStatus: vi.fn() }));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "binary-learner" }) }));
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

describe("BinarySearchPage", () => {
  beforeEach(async () => {
    progressState.start.mockReset();
    progressState.setStatus.mockReset();
    await i18n.changeLanguage("en");
    vi.stubGlobal("IntersectionObserver", ObserverStub);
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage("en");
  });

  it("ships five problem, tool, and code-free application cycles", () => {
    render(<BinarySearchPage />);
    expect(screen.getByRole("heading", { name: "Protect the condition. Cut the range." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /dinosaur holds a new rose cube/i })).toHaveAttribute(
      "src",
      "/learning/binary-search/dinosaur-sorted-objects.webp"
    );
    const introductionLab = screen.getByLabelText("Binary Search");
    expect(introductionLab).toHaveTextContent("Step 1 of 9");
    fireEvent.click(within(introductionLab).getByRole("button", { name: "Next step" }));
    fireEvent.click(within(introductionLab).getByRole("button", { name: "Next step" }));
    expect(introductionLab).toHaveTextContent("left ← mid");
    expect(introductionLab).toHaveTextContent("The crossed-out side can no longer contain the boundary.");
    const conditionLab = document.querySelector("section[aria-label='Can this condition be searched?']");
    if (!(conditionLab instanceof HTMLElement)) throw new Error("Condition-pattern lab was not rendered.");
    expect(document.getElementById("recognize")).not.toContainElement(conditionLab);
    expect(document.getElementById("numeric")).not.toContainElement(conditionLab);
    expect(document.getElementById("practice")).toContainElement(conditionLab);
    const lastPracticeLink = screen.getByRole("link", { name: /Packing Rectangles/ });
    expect(lastPracticeLink.compareDocumentPosition(conditionLab) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(screen.getAllByText("00 · Problem", { exact: true })).toHaveLength(5);
    const tools = screen.getAllByRole("button", { name: "Learn the tool" });
    expect(tools).toHaveLength(5);
    for (const button of tools) fireEvent.click(button);
    const closestSection = document.getElementById("closest");
    if (closestSection === null) throw new Error("Closest-value section was not rendered.");
    // The orientation pill was a one-option group that could never change anything, so the
    // closest-value trace now states its orientation in the lab heading instead.
    expect(within(closestSection).queryByRole("button", { name: "false-true" })).not.toBeInTheDocument();
    expect(within(closestSection).queryByRole("button", { name: "true-false" })).not.toBeInTheDocument();
    expect(within(closestSection).getByLabelText("Last-true exclusive-sentinel template")).toBeInTheDocument();
    expect(screen.getAllByText("C++ synchronized with this trace")).toHaveLength(5);
    expect(screen.getAllByText("1. Calculate mid").length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText("Left pointer")).not.toHaveLength(0);
    expect(document.querySelectorAll("code.guide-code")).toHaveLength(5);
    expect(document.querySelectorAll("[data-tool-visual='array']")).toHaveLength(2);
    expect(document.querySelectorAll("[data-tool-visual='number-line']")).toHaveLength(3);
    expect(document.querySelectorAll("[data-tool-visual='array'] [data-search-visual='array']")).toHaveLength(2);
    expect(document.querySelectorAll("[data-tool-visual='number-line'] [data-search-visual='number-line']")).toHaveLength(3);
    expect(document.querySelectorAll("[data-active-code-line='true']")).toHaveLength(5);
    const numericSection = document.getElementById("numeric");
    if (numericSection === null) throw new Error("Continuous square-root section was not rendered.");
    const numericTool = within(numericSection).getByLabelText("Continuous Binary Search on double");
    expect(numericTool).toHaveTextContent("double mid");
    expect(numericTool).toHaveTextContent("while (right - left > 1e-3)");
    expect(numericTool).not.toHaveTextContent("int mid");
    expect(numericTool).toHaveTextContent("Running line 4");
    expect(numericTool.querySelector<HTMLElement>("[data-pointer-lane='left']")?.style.left).toBe("0%");
    expect(numericTool.querySelector<HTMLElement>("[data-pointer-lane='right']")?.style.left).toBe("100%");
    const numericNext = within(numericTool).getByRole("button", { name: "Next step" });
    fireEvent.click(numericNext);
    expect(numericTool).toHaveTextContent("Running line 5");
    fireEvent.click(numericNext);
    expect(numericTool).toHaveTextContent("Running line 9");
    const pointerLanes = Array.from(numericTool.querySelectorAll<HTMLElement>("[data-pointer-lane]"));
    expect(pointerLanes.map((marker) => marker.dataset.pointerLane)).toEqual(["left", "mid", "right"]);
    expect(new Set(pointerLanes.map((marker) => (marker.firstElementChild as HTMLElement).style.bottom)).size).toBe(3);
    expect(pointerLanes.every((marker) => marker.firstElementChild?.classList.contains("leading-none"))).toBe(true);
    const firstSection = document.getElementById("first");
    if (firstSection === null) throw new Error("First-occurrence section was not rendered.");
    const firstTool = within(firstSection).getByLabelText("First-true exclusive-sentinel template");
    expect(firstTool).toHaveTextContent("Running line 4");
    const firstNext = within(firstTool).getByRole("button", { name: "Next step" });
    fireEvent.click(firstNext);
    expect(firstTool).toHaveTextContent("Running line 5");
    for (let frame = 2; frame < 12; frame += 1) fireEvent.click(firstNext);
    expect(firstTool).toHaveTextContent("Right pointer · answer");
    expect(firstTool).toHaveTextContent("right = 8 is the answer.");
    expect(document.body.textContent).not.toContain("int main");
    const applications = screen.getAllByRole("button", { name: "Show the problem connection" });
    expect(applications).toHaveLength(5);
    for (const button of applications) fireEvent.click(button);
    expect(screen.getByLabelText("Trace the first occurrence")).toHaveTextContent("Step 1 of 12");
    expect(screen.getByLabelText("Trace the first occurrence")).toHaveTextContent("The first target is at index 8.");
    expect(screen.getByLabelText("Compare the surviving neighbors")).toBeInTheDocument();
    const numericApplication = screen.getByLabelText("Control precision on a double interval");
    expect(numericApplication).toBeInTheDocument();
    expect(within(numericApplication).getByRole("button", { name: "Stop by epsilon" })).toHaveAttribute("aria-pressed", "true");
    expect(numericApplication).not.toHaveTextContent("Integer floor");
    fireEvent.change(within(numericApplication).getByLabelText("Value x"), { target: { value: "0" } });
    expect(numericApplication).toHaveTextContent("Step 1 of 60");
    expect(numericApplication.querySelector("[data-search-visual='number-line']")).toBeInTheDocument();
    expect(screen.getByLabelText("Inspect versions without listing them all")).toBeInTheDocument();
    expect(screen.getByLabelText("Spend powder ingredient by ingredient")).toBeInTheDocument();
    expect(screen.getByText("Maximum cookies: 4")).toBeInTheDocument();
  });

  it("keeps interaction local and persists only guide-level progress", () => {
    render(<BinarySearchPage />);
    expect(progressState.start).toHaveBeenCalledWith("binary-search", expect.any(Object));
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(progressState.setStatus).toHaveBeenCalledWith(
      { guideId: "binary-search", status: "completed" },
      expect.any(Object)
    );
    expect(JSON.stringify(progressState.setStatus.mock.calls)).not.toMatch(/mid|left|right|ingredient|trace/i);
  });

  it("ships the complete guide in Spanish", async () => {
    await i18n.changeLanguage("es");
    render(<BinarySearchPage />);
    expect(screen.getByRole("heading", { name: "Protege la condición. Recorta el rango." })).toBeInTheDocument();
    expect(screen.getAllByText("00 · Problema", { exact: true })).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: "Aprender la herramienta" })).toHaveLength(5);
    expect(screen.getByRole("link", { name: /Packing Rectangles/ })).toBeInTheDocument();
  });
});
