import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "./i18n/LocaleProvider.js";
import { ToasterProvider } from "./Toaster.js";

const trpcMocks = vi.hoisted(() => ({
  list: vi.fn(),
  classMembers: vi.fn(),
  searchClassCandidates: vi.fn(),
  addClassMember: vi.fn(),
  removeClassMember: vi.fn()
}));

vi.mock("./trpc.js", () => ({
  trpc: {
    leaderboard: {
      list: { query: trpcMocks.list },
      classMembers: { query: trpcMocks.classMembers },
      searchClassCandidates: { query: trpcMocks.searchClassCandidates },
      addClassMember: { mutate: trpcMocks.addClassMember },
      removeClassMember: { mutate: trpcMocks.removeClassMember }
    }
  }
}));

import { LeaderboardPage } from "./LeaderboardPage.js";

const originalTimezone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/New_York";
});

afterAll(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = (): void => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ToasterProvider>
          <LeaderboardPage />
        </ToasterProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
};

describe("LeaderboardPage", () => {
  it("loads defaults and automatically applies local inclusive dates and filters", async () => {
    trpcMocks.list.mockResolvedValue({
      rows: [{
        userId: 1,
        username: "tourist",
        judge: "codeforces",
        solvedCount: 42,
        rank: 1
      }],
      totalRows: 1,
      page: 0,
      pageSize: 50,
      hasNextPage: false,
      canManageClass: false,
      generatedAt: "2026-07-26T00:00:00.000Z"
    });
    renderPage();

    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledWith({
      scope: "all",
      judge: undefined,
      startAt: undefined,
      endAtExclusive: undefined,
      limit: 50
    }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("tourist")).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByLabelText("From").parentElement?.parentElement)
      .toHaveClass("grid", "sm:grid-cols-[1fr_1fr_auto]");

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-07-01" } });
    expect(screen.getByText("Choose both dates to apply a period.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Through"), { target: { value: "2026-07-02" } });
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledWith({
      scope: "all",
      judge: undefined,
      startAt: "2026-07-01T04:00:00.000Z",
      endAtExclusive: "2026-07-03T04:00:00.000Z",
      limit: 50
    }));

    fireEvent.click(screen.getByRole("button", { name: "Team" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Judge" }), {
      target: { value: "qoj" }
    });
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledWith(expect.objectContaining({
      scope: "team",
      judge: "qoj"
    })));
  });

  it("keeps the last valid result while a replacement date pair is reversed and clears to all-time", async () => {
    trpcMocks.list.mockResolvedValue({
      rows: [],
      totalRows: 0,
      page: 0,
      pageSize: 50,
      hasNextPage: false,
      canManageClass: false,
      generatedAt: "2026-07-26T00:00:00.000Z"
    });
    renderPage();
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-07-03" } });
    fireEvent.change(screen.getByLabelText("Through"), { target: { value: "2026-07-02" } });
    expect(screen.getByText("The end date cannot be before the start date.")).toBeInTheDocument();
    expect(trpcMocks.list).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue(""));
    expect(screen.getByText("No synchronized solves are available yet.")).toBeInTheDocument();
  });

  it("loads 50 rows then the full leaderboard without waiting for scrolling", async () => {
    let finish!: (value: unknown) => void;
    const full = new Promise((resolve) => { finish = resolve; });
    const rows = Array.from({ length: 51 }, (_, index) => ({
      userId: index + 1, username: `ranked-user-${index + 1}`, judge: "codeforces",
      solvedCount: 100 - index, rank: index + 1
    }));
    const result = { rows, totalRows: 51, page: 0, pageSize: 51, hasNextPage: false,
      canManageClass: false, generatedAt: "2026-07-26T00:00:00.000Z" };
    trpcMocks.list.mockImplementation((input: { limit?: number }) => input.limit === 50
      ? Promise.resolve({ ...result, rows: rows.slice(0, 50), pageSize: 50, hasNextPage: true })
      : full);
    renderPage();
    expect(await screen.findByText("ranked-user-1")).toBeInTheDocument();
    expect(await screen.findByRole("status", { name: "Loading..." })).toBeInTheDocument();
    expect(screen.queryByText("ranked-user-51")).not.toBeInTheDocument();
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledTimes(2));
    await act(async () => finish(result));
    expect(await screen.findByText("ranked-user-51")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading..." })).not.toBeInTheDocument();
  });
});
