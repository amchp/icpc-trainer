import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../i18n/i18n.js";
import { AnimationLibraryPage } from "./AnimationLibraryPage.js";
import { validateAnimationSearch } from "./search.js";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  Link: ({ children, to, params, search, ...props }: { children: ReactNode; to: string; params?: { groupId: string }; search?: Record<string, string> }) => (
    <a {...props} href={`${to.replace("$groupId", params?.groupId ?? "")}?${new URLSearchParams(search)}`}>{children}</a>
  )
}));

function Library() {
  const [search, setSearch] = useState<ReturnType<typeof validateAnimationSearch>>({});
  return <AnimationLibraryPage search={search} onSearchChange={setSearch} />;
}

beforeEach(async () => { await i18n.changeLanguage("en"); });
afterEach(cleanup);

describe("animation library", () => {
  it("lists groups once, finds either permutation member, and preserves filters in workspace links", () => {
    const { container } = render(<Library />);
    expect(container.querySelectorAll("[data-animation-card]")).toHaveLength(31);
    const search = screen.getByRole("searchbox", { name: "Search animations" });
    fireEvent.change(search, { target: { value: "recursive permutations" } });
    expect(container.querySelectorAll("[data-animation-card]")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "iterative permutations" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Topic" }), { target: { value: "brute-force" } });
    const card = container.querySelector('[data-animation-card="permutations"]');
    expect(card).toHaveAttribute("href", "/animations/permutations?q=iterative+permutations&topic=brute-force");
    expect(container.querySelectorAll("[data-animation-card]")).toHaveLength(1);
  });

  it("offers a reset for a query that has no results", () => {
    const { container } = render(<Library />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "does-not-exist-91823" } });
    expect(screen.getByRole("heading", { name: "No animations found" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(container.querySelectorAll("[data-animation-card]")).toHaveLength(31);
  });
});
