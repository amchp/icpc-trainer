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
let intersectionCallback: IntersectionObserverCallback | undefined;

class ObserverStub {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  process.env.TZ = "America/New_York";
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});

afterAll(() => {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  intersectionCallback = undefined;
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
      page: 0
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
      page: 0
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
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-07-03" } });
    fireEvent.change(screen.getByLabelText("Through"), { target: { value: "2026-07-02" } });
    expect(screen.getByText("The end date cannot be before the start date.")).toBeInTheDocument();
    expect(trpcMocks.list).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue(""));
    expect(screen.getByText("No synchronized solves are available yet.")).toBeInTheDocument();
  });

  it("loads subsequent 50-row pages when the scroll sentinel becomes visible", async () => {
    trpcMocks.list.mockImplementation(async (input: { page: number }) => ({
      rows: input.page === 0
        ? Array.from({ length: 50 }, (_, index) => ({
            userId: index + 1,
            username: index === 0 ? "first-page-user" : `page-one-user-${index}`,
            judge: "codeforces",
            solvedCount: 100 - index,
            rank: index + 1
          }))
        : [{
            userId: 51,
            username: "second-page-user",
            judge: "qoj",
            solvedCount: 1,
            rank: 51
          }],
      totalRows: 51,
      page: input.page,
      pageSize: 50,
      hasNextPage: input.page === 0,
      canManageClass: false,
      generatedAt: "2026-07-26T00:00:00.000Z"
    }));
    renderPage();

    expect(await screen.findByText("first-page-user")).toBeInTheDocument();
    expect(screen.getByText("Scroll to load more")).toBeInTheDocument();

    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    await waitFor(() => expect(trpcMocks.list).toHaveBeenCalledWith(expect.objectContaining({
      page: 1
    })));
    expect(await screen.findByText("second-page-user")).toBeInTheDocument();
    expect(screen.getByText("All ranked Judge Users are loaded.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });
});
