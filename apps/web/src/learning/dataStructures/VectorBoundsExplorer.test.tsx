import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { i18n } from "../../i18n/i18n.js";
import { VectorBoundsExplorer } from "./VectorBoundsExplorer.js";

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

describe.each(["en", "es"])("VectorBoundsExplorer (%s)", (locale) => {
  it("preserves the guide default, duplicate boundaries, and both end conditions", async () => {
    await i18n.changeLanguage(locale);
    const { container } = render(<VectorBoundsExplorer />);
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
    expect(container).toHaveTextContent("lower_bound(5) → 3");
    expect(container).toHaveTextContent("upper_bound(5) → 3");
    for (const [target, lower, upper] of [[0, 0, 0], [3, 1, 3], [5, 3, 3], [10, 5, 6], [12, 6, 6]] as const) {
      fireEvent.click(screen.getByRole("button", { name: String(target) }));
      expect(screen.getByRole("button", { name: String(target) })).toHaveAttribute("aria-pressed", "true");
      expect(container).toHaveTextContent(`lower_bound(${target}) → ${lower}`);
      expect(container).toHaveTextContent(`upper_bound(${target}) → ${upper}`);
      expect(container).toHaveTextContent(`< ${target} → ${lower}`);
      expect(container).toHaveTextContent(`≤ ${target} → ${upper}`);
      expect(container).toHaveTextContent(`≥ ${target} → ${6 - lower}`);
      expect(container).toHaveTextContent(`> ${target} → ${6 - upper}`);
    }
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(container).not.toHaveTextContent("vector.lab.");
  });
});
