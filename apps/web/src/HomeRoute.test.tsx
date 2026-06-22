import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectJudgesPage } from "./ConnectJudgesPage.js";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { CodeforcesConnectJudgePage } from "./CodeforcesConnectJudgePage.js";
import { HomeRoute } from "./HomeRoute.js";
import { PlaygroundPage } from "./PlaygroundPage.js";
import { QojConnectJudgePage } from "./QojConnectJudgePage.js";
import { SyncProvider } from "./SyncContext.js";
import { ToasterProvider } from "./Toaster.js";
import { trpc } from "./trpc.js";

const navigateMock = vi.hoisted(() => vi.fn());
const credentialStatusMock = vi.hoisted(() => vi.fn(async () => ({
  codeforces: {
    saved: true
  },
  qoj: {
    saved: false
  }
})));
const syncObservers = vi.hoisted(() =>
  new Map<string, Array<{ readonly onData?: (event: any) => void; readonly onError?: (error: any) => void }>>()
);
const syncSnapshots = vi.hoisted(() =>
  new Map<string, { readonly running: boolean; readonly events: readonly any[] }>()
);

const syncEvents = (provider: "codeforces" | "qoj") => [
  {
    type: "started" as const,
    provider,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: "submissions.syncing" as const,
    step: "submissions" as const,
    provider,
    usersTotal: 1,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: "submissions.userSyncing" as const,
    step: "submissions" as const,
    provider,
    userHandle: "tourist",
    userIndex: 1,
    usersTotal: 1,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: "submissions.userSynced" as const,
    step: "submissions" as const,
    provider,
    userHandle: "tourist",
    fetched: 3,
    inserted: 2,
    updated: 1,
    skipped: 0,
    missingProblems: 0,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: "contests.syncing" as const,
    step: "contests" as const,
    provider,
    contestsTotal: 1,
    contestsLeft: 1,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: "contests.contestSyncing" as const,
    step: "contests" as const,
    provider,
    contestJudgeId: "566",
    contestsTotal: 1,
    contestsLeft: 1,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: "contests.contestSynced" as const,
    step: "contests" as const,
    provider,
    contestJudgeId: "566",
    problemsSynced: 2,
    stepsTotal: 2,
    stepsLeft: 0
  },
  {
    type: "completed" as const,
    provider,
    stepsTotal: 2,
    stepsLeft: 0 as const,
    summary: {
      usersProcessed: 1,
      submissionsFetched: 3,
      submissionsInserted: 2,
      submissionsUpdated: 1,
      submissionsSkipped: 0,
      contestsSynced: 1,
      errors: 0
    }
  }
];

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock
}));

vi.mock("./trpc", () => ({
  trpc: {
    credentials: {
      status: {
        query: credentialStatusMock
      },
      events: {
        subscribe: vi.fn((_input, options) => {
          void credentialStatusMock().then((status) => {
            options.onData?.({
              type: "snapshot",
              status,
              occurredAt: new Date().toISOString()
            });
          });
          return { unsubscribe: vi.fn() };
        })
      },
      save: {
        mutate: vi.fn(async () => ({
          codeforces: {
            saved: true
          },
          qoj: {
            saved: true
          }
        }))
      },
      clear: {
        mutate: vi.fn(async () => ({
          codeforces: {
            saved: false
          },
          qoj: {
            saved: false
          }
        }))
      }
    },
    judges: {
      startSync: {
        mutate: vi.fn(async ({ provider }: { readonly provider: "codeforces" | "qoj" }) => {
          queueMicrotask(() => {
            for (const observer of syncObservers.get(provider) ?? []) {
              for (const event of syncEvents(provider)) {
                observer.onData?.(event);
              }
            }
          });
        })
      },
      observeSync: {
        subscribe: vi.fn((input: { readonly provider: "codeforces" | "qoj" }, options) => {
          const observers = syncObservers.get(input.provider) ?? [];
          observers.push(options);
          syncObservers.set(input.provider, observers);
          queueMicrotask(() => {
            const snapshot = syncSnapshots.get(input.provider) ?? {
              running: false,
              events: []
            };
            options.onData?.({
              type: "snapshot",
              provider: input.provider,
              running: snapshot.running,
              events: snapshot.events
            });
          });
          return {
            unsubscribe: vi.fn(() => {
              syncObservers.set(input.provider, (syncObservers.get(input.provider) ?? []).filter((observer) => observer !== options));
            })
          };
        })
      }
    },
    playground: {
      run: {
        mutate: vi.fn(async () => ({
          ok: true,
          result: null
        }))
      }
    }
  }
}));

const renderWithQuery = (ui: ReactNode): void => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToasterProvider>
        <ConnectedJudgesProvider>
          <SyncProvider>{ui}</SyncProvider>
        </ConnectedJudgesProvider>
      </ToasterProvider>
    </QueryClientProvider>
  );
};

describe("HomeRoute", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    syncObservers.clear();
    syncSnapshots.clear();
    credentialStatusMock.mockResolvedValue({
      codeforces: {
        saved: true
      },
      qoj: {
        saved: false
      }
    });
  });

  it("renders the home shell without sync progress while idle", async () => {
    renderWithQuery(<HomeRoute />);

    await waitFor(() => expect(screen.getByText("ICPC Trainer")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: /codeforces/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /synced/i })).toBeInTheDocument();
    expect(screen.queryByText("Judge sync")).not.toBeInTheDocument();
    expect(screen.queryByText("API playground")).not.toBeInTheDocument();
  });

  it("shows separate judge progress while a sync is running", async () => {
    syncSnapshots.set("codeforces", {
      running: true,
      events: syncEvents("codeforces").slice(0, 3)
    });

    renderWithQuery(<HomeRoute />);

    await waitFor(() => expect(screen.getAllByText("Codeforces")).toHaveLength(2));
    expect(screen.getByText("User submission sync")).toBeInTheDocument();
    expect(screen.getByText("1 user left")).toBeInTheDocument();
    expect(screen.queryByText("Contest sync")).not.toBeInTheDocument();
    expect(screen.queryByText("QOJ")).not.toBeInTheDocument();
  });

  it("starts Codeforces sync from the navbar", async () => {
    renderWithQuery(<HomeRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /synced/i }));

    await waitFor(() =>
      expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" })
    );
    await waitFor(() => expect(screen.queryByText("User submission sync")).not.toBeInTheDocument());
  });

  it("starts all authenticated judge syncs from the navbar", async () => {
    credentialStatusMock.mockResolvedValue({
      codeforces: {
        saved: true
      },
      qoj: {
        saved: true
      }
    });

    renderWithQuery(<HomeRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /synced/i }));

    await waitFor(() => expect(trpc.judges.startSync.mutate).toHaveBeenCalledTimes(2));
    expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" });
    expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "qoj" });
  });

  it("shows a toast when sync emits an error", async () => {
    vi.mocked(trpc.judges.observeSync.subscribe).mockImplementationOnce((input, options) => {
      const observers = syncObservers.get(input.provider) ?? [];
      observers.push(options);
      syncObservers.set(input.provider, observers);
      queueMicrotask(() => {
        options.onData?.({
          type: "snapshot",
          provider: input.provider,
          running: false,
          events: []
        });
      });
      return { unsubscribe: vi.fn() };
    });
    vi.mocked(trpc.judges.startSync.mutate as any).mockImplementationOnce(async ({ provider }: { readonly provider: "codeforces" | "qoj" }) => {
      queueMicrotask(() => {
        for (const observer of syncObservers.get(provider) ?? []) {
          observer.onData?.({
          type: "error",
          provider,
          phase: "contests",
          step: "contests",
          message: "Contest 100566 failed",
          contestJudgeId: "100566",
          stepsTotal: 1,
          stepsLeft: 1
        });
          observer.onData?.({
          type: "completed",
          provider,
          stepsTotal: 1,
          stepsLeft: 0,
          summary: {
            usersProcessed: 0,
            submissionsFetched: 0,
            submissionsInserted: 0,
            submissionsUpdated: 0,
            submissionsSkipped: 0,
            contestsSynced: 0,
            errors: 1
          }
        });
        }
      });
    });

    renderWithQuery(<HomeRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /synced/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sync codeforces");
    expect(screen.getByRole("alert")).toHaveTextContent("Contest 100566 failed");
  });

  it("stacks sync error toasts and removes the oldest when the stack is full", async () => {
    vi.mocked(trpc.judges.startSync.mutate as any).mockImplementationOnce(async ({ provider }: { readonly provider: "codeforces" | "qoj" }) => {
      queueMicrotask(() => {
        for (const observer of syncObservers.get(provider) ?? []) {
          for (const index of Array.from({ length: 8 }, (_, value) => value + 1)) {
            observer.onData?.({
            type: "error",
            provider,
            phase: "contests",
            step: "contests",
            message: `Contest ${index} failed`,
            contestJudgeId: String(index),
            stepsTotal: 8,
            stepsLeft: 8 - index
          });
          }
          observer.onData?.({
          type: "completed",
          provider,
          stepsTotal: 8,
          stepsLeft: 0,
          summary: {
            usersProcessed: 0,
            submissionsFetched: 0,
            submissionsInserted: 0,
            submissionsUpdated: 0,
            submissionsSkipped: 0,
            contestsSynced: 0,
            errors: 8
          }
        });
        }
      });
    });

    renderWithQuery(<HomeRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /synced/i }));

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(6));
    expect(screen.queryByText("Contest 1 failed")).not.toBeInTheDocument();
    expect(screen.queryByText("Contest 2 failed")).not.toBeInTheDocument();
    expect(screen.getByText("Contest 3 failed")).toBeInTheDocument();
    expect(screen.getByText("Contest 8 failed")).toBeInTheDocument();
  });

  it("refreshes credential status after clearing connected judges", async () => {
    credentialStatusMock
      .mockResolvedValueOnce({
        codeforces: {
          saved: true
        },
        qoj: {
          saved: true
        }
      })
      .mockResolvedValueOnce({
        codeforces: {
          saved: false
        },
        qoj: {
          saved: false
        }
      });
    vi.mocked(trpc.credentials.clear.mutate).mockImplementation(async (provider) => ({
      codeforces: {
        saved: provider !== "codeforces"
      },
      qoj: {
        saved: provider !== "qoj"
      }
    }));

    renderWithQuery(<HomeRoute />);

    fireEvent.click(await screen.findByRole("button", { name: /codeforces \+ qoj/i }));
    fireEvent.click(screen.getByText("Clear connected judges"));

    await waitFor(() => expect(trpc.credentials.clear.mutate).toHaveBeenCalledWith("codeforces"));
    expect(trpc.credentials.clear.mutate).toHaveBeenCalledWith("qoj");
    await waitFor(() => expect(credentialStatusMock).toHaveBeenCalledTimes(2));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/connect-judges" });
  });

  it("redirects to connect judges when no judge is connected", async () => {
    credentialStatusMock.mockResolvedValue({
      codeforces: {
        saved: false
      },
      qoj: {
        saved: false
      }
    });

    renderWithQuery(<HomeRoute />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/connect-judges" }));
  });

  it("navigates from connect judges to the selected provider page", () => {
    renderWithQuery(<ConnectJudgesPage />);

    fireEvent.click(screen.getByTestId("connect-judges-provider-qoj"));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/connect-judges/qoj" });
  });

  it("saves structured cookie fields from the QOJ connect judges page", async () => {
    renderWithQuery(<QojConnectJudgePage />);

    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "qoj-user" } });
    fireEvent.change(screen.getByLabelText("uojsessid"), { target: { value: "session" } });
    fireEvent.click(screen.getByRole("button", { name: /enter/i }));

    await waitFor(() =>
      expect(trpc.credentials.save.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "qoj",
          providerUserKey: "qoj-user",
          qoj: {
            cookieJar: "uoj_username=qoj-user; uojsessid=session"
          }
        })
      )
    );
    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  it("shows a toast with a clearer message when Codeforces connect cannot reach the server", async () => {
    vi.mocked(trpc.credentials.save.mutate).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    renderWithQuery(<CodeforcesConnectJudgePage />);

    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "tourist" } });
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "cf-key" } });
    fireEvent.change(screen.getByLabelText("API secret"), { target: { value: "cf-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /enter/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not connect Codeforces");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the ICPC Trainer server");
  });

  it("renders the playground with the shared navbar and saved credentials only", async () => {
    renderWithQuery(<PlaygroundPage />);

    await waitFor(() => expect(screen.getByText("ICPC Trainer")).toBeInTheDocument());
    expect(screen.getByText("API playground")).toBeInTheDocument();
    expect(screen.getByLabelText("Provider")).toBeInTheDocument();
    expect(screen.queryByLabelText("apiKey")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("apiSecret")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("uojsessid")).not.toBeInTheDocument();
  });

  it("runs playground calls without sending credential fields", async () => {
    renderWithQuery(<PlaygroundPage />);

    await waitFor(() => expect(screen.getByText("API playground")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Operation"), { target: { value: "contests" } });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() =>
      expect(trpc.playground.run.mutate).toHaveBeenCalledWith({
        provider: "codeforces",
        operation: "contests",
        contestId: "",
        userHandle: ""
      })
    );
  });
});
