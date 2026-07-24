import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChompGame } from "./ChompGame.js";
import { PlateGame } from "./PlateGame.js";
import { StonesGame } from "./StonesGame.js";

afterEach(cleanup);

describe("Introduction games", () => {
  it("keeps every winner explanation closed until requested", () => {
    render(<><PlateGame /><StonesGame /><ChompGame /></>);
    const toggles = screen.getAllByRole("button", { name: "Explain how to reason about the winner" });
    expect(toggles).toHaveLength(3);
    expect(toggles.every((button) => button.getAttribute("aria-expanded") === "false")).toBe(true);
    expect(screen.queryByText(/exact center|row 2, column 3|takes one to leave 24/i)).not.toBeInTheDocument();
  });

  it("does not change Plate Game turns after an overlapping move", () => {
    render(<PlateGame />);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 700, height: 700, right: 700, bottom: 700, x: 0, y: 0, toJSON: () => ({}) })
    });
    fireEvent.pointerDown(board, { clientX: 350, clientY: 350 });
    expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
    fireEvent.pointerDown(board, { clientX: 350, clientY: 350 });
    expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
    expect(screen.getByText("1 valid placements")).toBeInTheDocument();
  });

  it("resets Stones and closes its strategy disclosure", () => {
    render(<StonesGame />);
    fireEvent.click(screen.getByRole("button", { name: "Take 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Explain how to reason about the winner" }));
    expect(screen.getByText("24 stones remain")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset game" }));
    expect(screen.getByText("25 stones remain")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explain how to reason about the winner" })).toHaveAttribute("aria-expanded", "false");
  });

  it("places a radius-one plate on the 7 by 7 board with the mouse", () => {
    render(<PlateGame />);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 700, height: 700, right: 700, bottom: 700, x: 0, y: 0, toJSON: () => ({}) })
    });
    fireEvent.pointerDown(board, { clientX: 350, clientY: 350 });
    expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
    expect(screen.getByText("1 valid placements")).toBeInTheDocument();
    expect(board.querySelector("circle[data-plate='true']")).toHaveAttribute("cx", "3.5");
    expect(board.querySelector("circle[data-plate='true']")).toHaveAttribute("cy", "3.5");
  });

  it("moves a legal or illegal radius-one preview with the pointer and removes the old placement controls", () => {
    render(<PlateGame />);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 700, height: 700, right: 700, bottom: 700, x: 0, y: 0, toJSON: () => ({}) })
    });

    fireEvent.pointerMove(board, { clientX: 350, clientY: 350 });
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("cx", "3.5");
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("data-valid", "true");

    fireEvent.pointerMove(board, { clientX: 70, clientY: 350 });
    const invalidPreview = board.querySelector("circle[data-preview='true']");
    expect(Number(invalidPreview?.getAttribute("cx"))).toBeCloseTo(0.7);
    expect(invalidPreview).toHaveAttribute("data-valid", "false");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Place plate" })).not.toBeInTheDocument();

    fireEvent.pointerLeave(board);
    expect(board.querySelector("circle[data-preview='true']")).not.toBeInTheDocument();
  });

  it("keeps board placement available from the keyboard", () => {
    render(<PlateGame />);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    fireEvent.focus(board);
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("cx", "3.5");
    fireEvent.keyDown(board, { key: "ArrowRight" });
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("cx", "3.6");
    fireEvent.keyDown(board, { key: "Enter" });
    expect(board.querySelectorAll("circle[data-plate='true']")).toHaveLength(1);
    expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
  });

  it("lets the player change rectangular board dimensions and starts a fresh game", () => {
    render(<PlateGame />);
    expect(screen.getAllByRole("option", { name: "2" })).toHaveLength(2);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 900, height: 500, right: 900, bottom: 500, x: 0, y: 0, toJSON: () => ({}) })
    });
    fireEvent.pointerDown(board, { clientX: 450, clientY: 250 });
    expect(screen.getByText("1 valid placements")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Board width"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Board height"), { target: { value: "5" } });
    expect(board).toHaveAttribute("viewBox", "0 0 9 5");
    expect(board).toHaveAccessibleName("9 by 5 Plate Game board");
    expect(screen.getByText("0 valid placements")).toBeInTheDocument();
    expect(screen.getByText("Player 1 to move")).toBeInTheDocument();

    fireEvent.pointerMove(board, { clientX: 450, clientY: 250 });
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("cx", "4.5");
    expect(board.querySelector("circle[data-preview='true']")).toHaveAttribute("cy", "2.5");
  });

  it("plays the single legal circle on a 2 by 2 board", () => {
    render(<PlateGame />);
    fireEvent.change(screen.getByLabelText("Board width"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Board height"), { target: { value: "2" } });
    const board = screen.getByRole("img", { name: "2 by 2 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) })
    });

    fireEvent.pointerDown(board, { clientX: 100, clientY: 100 });
    expect(screen.getByText("Player 1 wins")).toBeInTheDocument();
    expect(board.querySelectorAll("circle[data-plate='true']")).toHaveLength(1);
    expect(board.querySelector("circle[data-preview='true']")).not.toBeInTheDocument();
  });

  it("does not round an illegal mouse placement into the board or out of an overlap", () => {
    render(<PlateGame />);
    const board = screen.getByRole("img", { name: "7 by 7 Plate Game board" });
    Object.defineProperty(board, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 700, height: 700, right: 700, bottom: 700, x: 0, y: 0, toJSON: () => ({}) })
    });

    fireEvent.pointerDown(board, { clientX: 96, clientY: 350 });
    expect(board.querySelectorAll("circle[data-plate='true']")).toHaveLength(0);
    expect(screen.getByText("Player 1 to move")).toBeInTheDocument();

    fireEvent.pointerDown(board, { clientX: 100, clientY: 350 });
    expect(board.querySelectorAll("circle[data-plate='true']")).toHaveLength(1);
    fireEvent.pointerDown(board, { clientX: 296, clientY: 350 });
    expect(board.querySelectorAll("circle[data-plate='true']")).toHaveLength(1);
    expect(screen.getByText("Player 2 to move")).toBeInTheDocument();
  });

  it("makes poison an immediate Chomp loss", () => {
    render(<ChompGame />);
    fireEvent.click(screen.getByRole("button", { name: "Poison at row 1, column 1" }));
    expect(screen.getByText("Player 2 wins")).toBeInTheDocument();
  });
});
