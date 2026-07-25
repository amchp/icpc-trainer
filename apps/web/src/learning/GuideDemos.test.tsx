import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BooleanExpressionPlayground, doubleToBits, integerToBits, LogicalOperatorGuide, TypeExplorer } from "./GuideDemos.js";

afterEach(cleanup);

describe("guide demos", () => {
  it("shows every primitive representation at the same time", () => {
    render(<TypeExplorer />);

    for (const type of ["bool", "int", "double", "char"]) {
      expect(screen.getByRole("heading", { name: type })).toBeInTheDocument();
      expect(screen.getByLabelText(`Binary value for ${type}`)).toBeInTheDocument();
    }
  });

  it("updates binary representations when values change", () => {
    render(<TypeExplorer />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "Value for int" }), { target: { value: "5" } });
    expect(screen.getByLabelText("Binary value for int")).toHaveTextContent("00000000000000000000000000000101");

    fireEvent.change(screen.getByRole("textbox", { name: "Value for char" }), { target: { value: "B" } });
    expect(screen.getByLabelText("Binary value for char")).toHaveTextContent("01000010");
    expect(screen.getByText("int: 66")).toBeInTheDocument();

    const boolean = screen.getByRole("switch");
    expect(boolean).toHaveAttribute("aria-checked", "true");
    fireEvent.click(boolean);
    expect(boolean).toHaveAttribute("aria-checked", "false");
    expect(within(screen.getByRole("region", { name: "bool" })).getByLabelText("Binary value for bool")).toHaveTextContent("00000000");
  });

  it("encodes signed integers and IEEE 754 doubles", () => {
    expect(integerToBits(-1)).toBe("11111111111111111111111111111111");
    expect(doubleToBits(1)).toBe("0011111111110000000000000000000000000000000000000000000000000000");
  });

  it("walks through the combined boolean expression with rebuilt inputs", () => {
    const { container } = render(<BooleanExpressionPlayground />);
    const advanceTrace = (steps: number): void => {
      for (let step = 0; step < steps; step += 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next trace step" }));
      }
    };

    expect(screen.getByRole("status")).toHaveTextContent("accepted becomes true");
    advanceTrace(3);
    expect(screen.getByText("Advance to the next stage")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Verdict" }), { target: { value: "P" } });
    expect(screen.getByRole("status")).toHaveTextContent("accepted becomes false");
    advanceTrace(5);
    expect(screen.getByText("Review the requirements")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Invited" }));
    advanceTrace(3);
    expect(screen.getByText("Advance to the next stage")).toBeInTheDocument();
    expect(container.querySelector('[data-guide-line="3"]')).toHaveTextContent("char verdict = 'P';");
    expect(container.querySelector('[data-guide-line="5"]')).toHaveTextContent("bool invited = true;");
  });

  it("shows when short-circuit evaluation skips B", () => {
    render(<LogicalOperatorGuide />);

    const controls = screen.getByRole("group", { name: "Interactive controls" });
    expect(within(controls).getAllByRole("switch")).toHaveLength(2);
    expect(screen.getByText(/Click either switch to change an input/)).toBeInTheDocument();

    const andPath = screen.getByRole("group", { name: "AND evaluation path" });
    const orPath = screen.getByRole("group", { name: "OR evaluation path" });
    expect(within(andPath).getByText("Skip B")).toBeInTheDocument();
    expect(within(orPath).getByText("Evaluate B")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Toggle A" }));
    expect(within(andPath).getByText("Evaluate B")).toBeInTheDocument();
    expect(within(orPath).getByText("Skip B")).toBeInTheDocument();
  });
});
