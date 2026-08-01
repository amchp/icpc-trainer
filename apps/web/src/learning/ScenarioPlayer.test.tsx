import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18n } from "../i18n/i18n.js";
import type { ScenarioPreset } from "./ScenarioPlayer.js";
import { ScenarioPlayer } from "./ScenarioPlayer.js";

const presets: readonly ScenarioPreset[] = [
  {
    id: "first",
    label: "First",
    description: "First description",
    frames: [
      {
        narration: "Frame one",
        visuals: [{ kind: "grid", label: "Grid state", rows: [[{ text: ".", tone: "visited" }, { text: "#", tone: "wall" }]], cursor: { row: 0, column: 0 } }]
      },
      {
        narration: "Frame two",
        visuals: [{ kind: "graph", label: "Graph state", directed: true, nodes: [{ id: "1", label: "One", x: 25, y: 50, tone: "settled" }, { id: "2", label: "Two", x: 75, y: 50, tone: "queued" }], edges: [{ from: "1", to: "2", weight: 4, tone: "tree" }, { from: "1", to: "2", weight: 7, tone: "tree" }] }]
      }
    ]
  },
  {
    id: "second",
    label: "Second",
    description: "Second description",
    frames: [{ narration: "Second frame", visuals: [{ kind: "output", label: "Output", lines: ["done"] }] }]
  }
];

describe("ScenarioPlayer", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("steps, resets, and switches between one selected preset", () => {
    render(<ScenarioPlayer label="Demo" presets={presets} />);
    const player = screen.getByRole("region", { name: "Demo" });
    const first = within(player).getByRole("tab", { name: "First" });
    const second = within(player).getByRole("tab", { name: "Second" });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveAttribute("aria-selected", "false");
    expect(player).toHaveTextContent("Step 1 of 2");
    expect(player).toHaveTextContent("Frame one");

    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(player).toHaveTextContent("Step 2 of 2");
    expect(player).toHaveTextContent("Frame two");
    expect(within(player).getByRole("button", { name: "Play" })).toBeDisabled();

    fireEvent.click(within(player).getByRole("button", { name: "Previous trace step" }));
    expect(player).toHaveTextContent("Step 1 of 2");
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    fireEvent.click(within(player).getByRole("button", { name: "Reset trace" }));
    expect(player).toHaveTextContent("Step 1 of 2");

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("aria-selected", "false");
    expect(player).toHaveTextContent("Step 1 of 1");
    expect(player.querySelectorAll("[aria-selected='true'][data-scenario-preset]")).toHaveLength(1);
  });

  it("renders accessible grid and graph summaries", () => {
    render(<ScenarioPlayer label="Demo" presets={presets} />);
    const player = screen.getByRole("region", { name: "Demo" });
    expect(within(player).getByRole("img", { name: "Grid state" })).toHaveAttribute("aria-describedby");
    expect(player).toHaveTextContent(/row 0 column 0: visited/i);
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(within(player).getByRole("img", { name: "Graph state" })).toHaveAttribute("aria-describedby");
    expect(player).toHaveTextContent(/One: settled/i);
    expect(player).toHaveTextContent(/1 → 2 weight 4: tree edge/i);
    const parallelEdges = player.querySelectorAll("line[data-edge-tone='tree']");
    expect(parallelEdges).toHaveLength(2);
    expect(parallelEdges[0]?.getAttribute("y1")).not.toBe(parallelEdges[1]?.getAttribute("y1"));
    expect(player.querySelectorAll("[data-edge-marker='tree']")).toHaveLength(0);
  });

  it("disables autoplay under reduced motion while preserving manual stepping", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ScenarioPlayer label="Demo" presets={presets} />);
    const player = screen.getByRole("region", { name: "Demo" });
    expect(within(player).getByRole("button", { name: "Play" })).toBeDisabled();
    expect(player).toHaveTextContent(/automatic playback is unavailable/i);
    fireEvent.click(within(player).getByRole("button", { name: "Next trace step" }));
    expect(player).toHaveTextContent("Frame two");
  });

  it("renders the defensive fallback for empty presets", () => {
    render(<ScenarioPlayer label="Empty" presets={[]} />);
    expect(screen.getByRole("region", { name: "Empty" })).toHaveTextContent(/unavailable/i);
  });
});
