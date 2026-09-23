import type { FindProblemsOverview } from "@icpc-trainer/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FindProblemsPage } from "./FindProblemsPage.js";
import { clearAuthenticatedQueryCache, invalidateAfterJudgeSync, queryKeys } from "./queryKeys.js";

const api = vi.hoisted(() => ({ preview: vi.fn(), overview: vi.fn() }));
vi.mock("./trpc.js", () => ({ trpc: { findProblems: {
  overview: { query: (input?: { limit?: number }) => input?.limit === 50 ? api.preview(input) : api.overview() }
} } }));

const overview = (names: string[], rating = 800): FindProblemsOverview => ({
  rows: names.map((name) => ({
    contestName: "Contest", contestLink: "https://example.com/contest",
    problemJudgeId: name, problemName: name, problemLink: `https://example.com/${name}`,
    rating, solvePercentage: 50, friendSolvedCount: 0, tags: ["math"]
  })),
  tags: [{ name: "math", count: names.length }], ratingRange: { min: rating, max: rating }
});
const deferred = () => {
  let resolve!: (value: FindProblemsOverview) => void;
  const promise = new Promise<FindProblemsOverview>((done) => { resolve = done; });
  return { promise, resolve };
};
const mount = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
  render(<QueryClientProvider client={client}><FindProblemsPage /></QueryClientProvider>);
  return client;
};

describe("progressive Find Problems loading", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it("shows the first rows before the full request finishes, then enables complete-list controls", async () => {
    const small = deferred();
    const full = deferred();
    api.preview.mockReturnValue(small.promise);
    api.overview.mockReturnValue(full.promise);
    mount();
    expect(api.preview).toHaveBeenCalledTimes(1);
    expect(api.overview).not.toHaveBeenCalled();
    await act(async () => small.resolve(overview(["First problem"])));
    expect(await screen.findByRole("link", { name: "First problem" })).toBeInTheDocument();
    await waitFor(() => expect(api.overview).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Random" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeDisabled();
    await act(async () => full.resolve(overview(["First problem", "More problems"])));
    expect(await screen.findByRole("link", { name: "More problems" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Random" })).toBeEnabled();
    expect(screen.getByRole("searchbox")).toBeEnabled();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("falls back to the full request after a failed preview", async () => {
    api.preview.mockRejectedValue(new Error("preview unavailable"));
    api.overview.mockResolvedValue(overview(["Full result"]));
    mount();
    expect(await screen.findByRole("link", { name: "Full result" })).toBeInTheDocument();
    expect(api.overview).toHaveBeenCalledTimes(1);
  });

  it("keeps the preview after a full-load failure and supports retry", async () => {
    api.preview.mockResolvedValue(overview(["First problem"]));
    api.overview.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(overview(["Full result"]));
    mount();
    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(screen.getByRole("link", { name: "First problem" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Full result" })).toBeInTheDocument();
  });

  it("uses a fresh cached full list without repeating either request", async () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.findProblemsOverview, overview(["Cached problem"]));
    mount(client);
    expect(screen.getByRole("link", { name: "Cached problem" })).toBeInTheDocument();
    expect(api.preview).not.toHaveBeenCalled();
    expect(api.overview).not.toHaveBeenCalled();
  });

  it("invalidates and clears the preview with the full user-owned list", () => {
    const client = new QueryClient();
    client.setQueryData([...queryKeys.findProblemsOverview, { limit: 50 }], overview(["Private preview"]));
    client.setQueryData(queryKeys.findProblemsOverview, overview(["Private full"]));
    invalidateAfterJudgeSync(client);
    expect(client.getQueryState([...queryKeys.findProblemsOverview, { limit: 50 }])?.isInvalidated).toBe(true);
    clearAuthenticatedQueryCache(client);
    expect(client.getQueryData([...queryKeys.findProblemsOverview, { limit: 50 }])).toBeUndefined();
    expect(client.getQueryData(queryKeys.findProblemsOverview)).toBeUndefined();
  });
});
