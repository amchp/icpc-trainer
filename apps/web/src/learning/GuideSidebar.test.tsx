import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GuideSidebar } from "./GuideSidebar.js";

afterEach(cleanup);

describe("GuideSidebar", () => {
  it("renders a responsive rail that restores the sticky desktop sidebar", () => {
    render(<GuideSidebar sections={[{ id: "one", label: "One" }, { id: "two", label: "Two" }]} activeSection="two" />);

    expect(screen.getByText("Section 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /One/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /Two/ })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("navigation", { name: "Guide sections" })).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("navigation", { name: "Guide sections" }).parentElement?.parentElement).toHaveClass("lg:top-6");
    expect(screen.getByRole("list")).toHaveClass("lg:flex-col", "lg:items-stretch");
  });
});
