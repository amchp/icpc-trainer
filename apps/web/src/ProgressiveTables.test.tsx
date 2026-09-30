import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ContestsPage } from "./ContestsPage.js";
import { UpsolvingPage } from "./UpsolvingPage.js";
import { ContestFinderPage } from "./ContestFinderPage.js";
import { FriendsRoster } from "./FriendsRoster.js";
import { TeamPage } from "./TeamPage.js";

const api = vi.hoisted(() => ({ upsolving: vi.fn(), reviewLater: vi.fn(), error: vi.fn(), contests: vi.fn(), friends: vi.fn(), team: vi.fn(), replace: vi.fn() }));
vi.mock("./trpc.js", () => ({ trpc: {
  upsolving: { overview: { query: api.upsolving }, setReviewLater: { mutate: api.reviewLater } },
  contestFinder: { overview: { query: api.contests } },
  account: { dataStatus: { query: async () => ({ hasSyncedContests: true }) } },
  friends: { roster: { query: api.friends }, add: { mutate: vi.fn() }, replace: { mutate: api.replace } },
  team: { roster: { query: api.team }, add: { mutate: vi.fn() }, replace: { mutate: api.replace } }
} }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }));
vi.mock("./ConnectedJudgesContext.js", () => ({ useConnectedJudges: () => ({
  status: "ready", hasConnectedJudge: true, connectedJudges: [{ id: "codeforces", label: "Codeforces" }]
}) }));
vi.mock("./useFriendSubmissionSync.js", () => ({ useFriendSubmissionSync: () => ({ states: [] }) }));
vi.mock("./Toaster.js", () => ({ useToaster: () => ({ error: api.error }) }));

const row = (name: string, id: number) => ({
  id, name, judge: "codeforces", judgeId: String(id), link: `https://codeforces.com/gym/${id}`,
  contestName: "Contest", problemJudgeId: String(id), problemName: name,
  problemLink: `https://codeforces.com/gym/${id}/problem/A`, solvePercentage: 50, rating: 800,
  friendSolvedCount: 0, status: "attempted", problemCount: 2, solvedCount: 1,
  averageSolvePercentage: 50, updatedAt: "2026-01-01T00:00:00Z",
  participants: 1, stars: 1, friendCount: 1, handles: ["friend"],
  username: name, type: "friend"
});
const result = (names: string[]) => {
  const rows = names.map((name, index) => row(name, index + 1));
  return { rows, contests: rows, users: rows, updatedAt: null,
    summary: { contestCount: rows.length, problemCount: rows.length, solvedCount: 0, attemptedCount: rows.length } };
};
const mount = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it.each([
  ["Contests", ContestsPage, api.upsolving],
  ["Upsolving", UpsolvingPage, api.upsolving],
  ["Contest Finder", ContestFinderPage, api.contests],
  ["Friends", FriendsRoster, api.friends],
  ["Team", TeamPage, api.team]
] as const)("loads the initial %s table then all rows with a footer spinner", async (_name, Page, read) => {
  let finish!: (value: ReturnType<typeof result>) => void;
  const full = new Promise<ReturnType<typeof result>>((resolve) => { finish = resolve; });
  read.mockImplementation((input?: { limit?: number }) => input?.limit === 50 ? Promise.resolve(result(["Initial row"])) : full);
  mount(<Page />);
  expect(await screen.findByText("Initial row")).toBeInTheDocument();
  expect(await screen.findByRole("status", { name: "Loading..." })).toBeInTheDocument();
  expect(read).toHaveBeenNthCalledWith(1, { limit: 50 });
  await waitFor(() => expect(read).toHaveBeenNthCalledWith(2, undefined));
  await act(async () => finish(result(["Initial row", "Remaining row"])));
  expect(await screen.findByText("Remaining row")).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading..." })).not.toBeInTheDocument();
});

it("waits for a full roster before allowing removal and preserves unseen friends", async () => {
  const names = Array.from({ length: 51 }, (_, index) => `friend-${index}`);
  let finish!: (value: ReturnType<typeof result>) => void;
  api.friends.mockImplementation((input?: { limit?: number }) => input?.limit === 50
    ? Promise.resolve(result(names.slice(0, 50)))
    : new Promise((resolve) => { finish = resolve; }));
  api.replace.mockResolvedValue(result(names.slice(1)));
  mount(<FriendsRoster />);
  expect(await screen.findByText("friend-0")).toBeInTheDocument();
  const remove = screen.getByRole("button", { name: /remove friend-0/i });
  expect(remove).toBeDisabled();
  fireEvent.click(remove);
  expect(api.replace).not.toHaveBeenCalled();
  await act(async () => finish(result(names)));
  await waitFor(() => expect(remove).toBeEnabled());
  fireEvent.click(remove);
  await waitFor(() => expect(api.replace).toHaveBeenCalledWith({
    users: names.slice(1).map((username) => ({ username, judge: "codeforces" }))
  }));
});

it("saves Review later and refreshes Upsolving from the server", async () => {
  let saved = false;
  api.upsolving.mockImplementation(async () => {
    const overview = result(["Practice"]);
    return { ...overview, rows: overview.rows.map((row) => ({ ...row, status: saved ? "review_later" : "attempted" })) };
  });
  api.reviewLater.mockImplementation(async () => { saved = true; return { ok: true }; });
  mount(<UpsolvingPage />);
  const select = await screen.findByRole("combobox", { name: "Change status for Practice" });
  fireEvent.change(select, { target: { value: "review_later" } });
  await waitFor(() => expect(api.reviewLater).toHaveBeenCalledWith({ judge: "codeforces", problemJudgeId: "1", reviewLater: true }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "Practice" })).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /filter by status/i }));
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Review later" }));
  expect(screen.getByRole("combobox", { name: "Change status for Practice" })).toHaveValue("review_later");
});

it("keeps the original status and reports a failed Review later save", async () => {
  api.upsolving.mockResolvedValue(result(["Practice"]));
  api.reviewLater.mockRejectedValue(new Error("Save failed"));
  mount(<UpsolvingPage />);
  const select = await screen.findByRole("combobox", { name: "Change status for Practice" });
  fireEvent.change(select, { target: { value: "review_later" } });
  await waitFor(() => expect(api.error).toHaveBeenCalledWith(expect.objectContaining({ title: "Unable to save problem status." })));
  expect(screen.getByRole("combobox", { name: "Change status for Practice" })).toHaveValue("automatic");
  expect(screen.getByRole("link", { name: "Practice" })).toBeInTheDocument();
});

it("keeps filtered empty results loading until the full response settles", async () => {
  let finish!: (value: ReturnType<typeof result>) => void;
  api.contests.mockImplementation((input?: { limit?: number }) => input?.limit === 50
    ? Promise.resolve(result(["Initial row"]))
    : new Promise((resolve) => { finish = resolve; }));
  mount(<ContestFinderPage filters={{ searchQuery: "Remaining", judgeSourceFilters: ["codeforces-gym"] }} />);
  expect(await screen.findByRole("status", { name: "Loading..." })).toBeInTheDocument();
  expect(screen.queryByText("Initial row")).not.toBeInTheDocument();
  await waitFor(() => expect(api.contests).toHaveBeenCalledTimes(2));
  await act(async () => finish(result(["Initial row", "Remaining row"])));
  expect(await screen.findByText("Remaining row")).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading..." })).not.toBeInTheDocument();
});
