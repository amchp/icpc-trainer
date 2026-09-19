import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { AnimationPresentationProvider } from "./AnimationLayout.js";
import { AnimationErrorBoundary, AnimationWorkspacePage } from "./AnimationWorkspacePage.js";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => <a href={to} className={className}>{children}</a>
}));

const renderWorkspace = (id = "permutations") => render(
  <AnimationPresentationProvider><AnimationWorkspacePage groupId={id} search={{ q: "recursive", topic: "brute-force" }} /></AnimationPresentationProvider>
);

beforeEach(async () => {
  await i18n.changeLanguage("en");
  window.history.replaceState({}, "", "/animations/permutations?q=recursive#old-state");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("animation workspace", () => {
  it("keeps both real permutation traces mounted and independently advanced in presentation", async () => {
    const { container } = renderWorkspace();
    await waitFor(() => expect(container.querySelectorAll("[data-animation-tool]")).toHaveLength(2));
    const recursive = within(container.querySelector('[data-animation-tool="recursive-permutations"]') as HTMLElement);
    const iterative = within(container.querySelector('[data-animation-tool="iterative-permutations"]') as HTMLElement);
    const recursiveNode = container.querySelector('[data-animation-tool="recursive-permutations"]');
    fireEvent.click(recursive.getByRole("button", { name: "Next trace step" }));
    fireEvent.click(recursive.getByRole("button", { name: "Next trace step" }));
    fireEvent.click(iterative.getByRole("button", { name: "Next trace step" }));
    expect(recursive.getByText(/^Step 3 of/)).toBeInTheDocument();
    expect(iterative.getByText(/^Step 2 of/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Present" }));
    expect(screen.getByRole("button", { name: "Exit presentation" })).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Full guide" })).not.toBeInTheDocument();
    expect(container.querySelector('[data-animation-tool="recursive-permutations"]')).toBe(recursiveNode);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Present" })).toHaveFocus());
    expect(recursive.getByText(/^Step 3 of/)).toBeInTheDocument();
    expect(iterative.getByText(/^Step 2 of/)).toBeInTheDocument();
  });

  it("copies only the canonical group URL, excluding filters and fragment state", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderWorkspace();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy link" })));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/animations/permutations`);
    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });

  it("provides a selectable canonical URL when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    const fallback = await screen.findByRole("textbox", { name: /Could not copy the link/ });
    expect(fallback).toHaveValue(`${window.location.origin}/animations/permutations`);
    expect(fallback).toHaveAttribute("readonly");
  });

  it("shows a recoverable unknown-group state instead of substituting a tool", () => {
    const { container } = renderWorkspace("missing");
    expect(screen.getByRole("heading", { name: "Workspace not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to library" })).toHaveAttribute("href", "/animations");
    expect(container.querySelector("[data-animation-tool]")).toBeNull();
  });

  it("contains player failures and exposes the supplied recovery panel", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function BrokenPlayer(): never { throw new Error("chunk failed"); }
    render(<AnimationErrorBoundary fallback={<div role="alert">Reload workspace</div>}><BrokenPlayer /></AnimationErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("Reload workspace");
  });
});
