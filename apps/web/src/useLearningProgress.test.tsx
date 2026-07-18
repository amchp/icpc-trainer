import { LEARNING_GUIDE_IDS, LEARNING_PROGRESS_STATUSES } from "@icpc-trainer/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "./queryKeys.js";
import { useLearningProgress, useStartLearningGuide } from "./useLearningProgress.js";

const mocks = vi.hoisted(() => ({
  userId: "clerk-user-one" as string | null,
  list: vi.fn(),
  start: vi.fn()
}));

vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: mocks.userId }) }));
vi.mock("./trpc.js", () => ({
  trpc: {
    learningProgress: {
      list: { query: mocks.list },
      start: { mutate: mocks.start },
      setStatus: { mutate: vi.fn() }
    }
  }
}));

const row = {
  guideId: LEARNING_GUIDE_IDS.ProgrammingFundamentals,
  status: LEARNING_PROGRESS_STATUSES.InProgress,
  startedAt: "2026-07-17T00:00:00.000Z",
  completedAt: null,
  updatedAt: "2026-07-17T00:00:00.000Z"
} as const;

describe("Learning Progress cache scope", () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => React.JSX.Element;

  beforeEach(() => {
    mocks.userId = "clerk-user-one";
    mocks.list.mockReset();
    mocks.start.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  it("does not expose one Clerk account's cached query to another account", async () => {
    mocks.list.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);
    const { result, rerender } = renderHook(() => useLearningProgress(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([row]));
    mocks.userId = "clerk-user-two";
    rerender();

    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(queryClient.getQueryData(queryKeys.learningProgress("clerk-user-one"))).toEqual([row]);
    expect(queryClient.getQueryData(queryKeys.learningProgress("clerk-user-two"))).toEqual([]);
  });

  it("writes a successful mutation only to its Clerk account's progress cache", async () => {
    mocks.start.mockResolvedValue(row);
    queryClient.setQueryData(queryKeys.learningProgress("clerk-user-two"), []);
    const { result } = renderHook(() => useStartLearningGuide(), { wrapper });

    await act(() => result.current.mutateAsync(LEARNING_GUIDE_IDS.ProgrammingFundamentals));

    expect(queryClient.getQueryData(queryKeys.learningProgress("clerk-user-one"))).toEqual([row]);
    expect(queryClient.getQueryData(queryKeys.learningProgress("clerk-user-two"))).toEqual([]);
    expect(queryClient.getMutationCache().getAll()[0]?.options.mutationKey).toEqual(
      queryKeys.learningProgressStart("clerk-user-one")
    );
    expect(queryClient.getMutationCache().getAll()[0]?.options.retry).toBe(2);
  });
});
