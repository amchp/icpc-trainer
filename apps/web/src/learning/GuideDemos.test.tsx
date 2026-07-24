import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TypeExplorer } from "./GuideDemos.js";

afterEach(cleanup);

describe("guide demos", () => {
  it("exposes the selected type programmatically", () => {
    render(<TypeExplorer />);

    const integer = screen.getByRole("button", { name: "int" });
    const decimal = screen.getByRole("button", { name: "double" });
    expect(integer).toHaveAttribute("aria-pressed", "true");
    expect(decimal).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(decimal);
    expect(integer).toHaveAttribute("aria-pressed", "false");
    expect(decimal).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("3.1416")).toBeInTheDocument();
  });
});
