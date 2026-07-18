import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/clerk-react", () => ({
  UserButton: () => <button type="button" aria-label="User menu" />
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { hasSyncedContests: false, syncedContestJudges: [] }, isLoading: false })
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ activeProps: _activeProps, children, to, ...props }: { activeProps?: unknown; children: ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  )
}));

vi.mock("./ConnectedJudgesContext.js", () => ({
  useConnectedJudges: () => ({ connectedJudges: [] })
}));

vi.mock("./i18n/LanguageButton.js", () => ({
  LanguageButton: ({ className, fullWidth = false }: { className?: string; fullWidth?: boolean }) => (
    <button type="button" className={className} data-full-width={fullWidth}>Español</button>
  )
}));

vi.mock("./SyncContext.js", () => ({
  useSync: () => ({ startSync: vi.fn(), status: "idle" })
}));

vi.mock("./Toaster.js", () => ({
  useToaster: () => ({ warning: vi.fn() })
}));

import { AppHeader } from "./AppHeader.js";

const primaryLabels = [
  "Find Problems",
  "Upsolving",
  "Contests",
  "Contest Finder",
  "Resources",
  "Team",
  "Friends"
];

afterEach(cleanup);

describe("AppHeader", () => {
  it("keeps the desktop navigation and utilities in the original single header row", () => {
    render(<AppHeader />);

    const primaryNavigation = screen.getByRole("navigation");
    expect(primaryNavigation).toHaveClass("hidden", "sm:flex");
    expect(within(primaryNavigation).getAllByRole("link").map((link) => link.textContent)).toEqual(primaryLabels);
    expect(primaryNavigation.parentElement).toHaveClass("h-14", "items-center");

    expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Español" })).toHaveClass("hidden", "sm:inline-flex");
  });

  it("moves primary navigation, Judges, and the small-screen language row into the compact menu", () => {
    render(<AppHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const compactNavigation = screen.getAllByRole("navigation").find((element) => element.classList.contains("sm:hidden"));
    expect(compactNavigation).toBeDefined();
    const compactLinks = within(compactNavigation!).getAllByRole("link");
    expect(compactLinks.map((link) => link.textContent)).toEqual([...primaryLabels, "Judges"]);

    const languageButtons = screen.getAllByRole("button", { name: "Español" });
    expect(languageButtons).toHaveLength(2);
    expect(languageButtons[1]).toHaveAttribute("data-full-width", "true");
    expect(languageButtons[1]?.parentElement).toHaveClass("sm:hidden");
  });
});
