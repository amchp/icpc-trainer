import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  JUDGE_SYNC_EVENT_TYPES as JudgeSyncEventType,
  JUDGE_SYNC_STEPS as JudgeSyncStep,
  PROVIDER_STATE_EVENT_TYPES,
  RUN_STATUSES as SyncRunStatus,
  SYNC_STEP_STATUSES as SyncStepStatus,
  LOCALIZED_MESSAGE_CODES,
  type JudgeProvider
} from "@icpc-trainer/shared";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectJudgesPage } from "./ConnectJudgesPage.js";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { CodeforcesConnectJudgePage } from "./CodeforcesConnectJudgePage.js";
import { AccountPage } from "./AccountPage.js";
import { PlaygroundPage } from "./PlaygroundPage.js";
import { ProtectedLayout } from "./ProtectedLayout.js";
import { QojConnectJudgeTutorialPage } from "./QojConnectJudgeTutorialPage.js";
import { QojConnectJudgePage } from "./QojConnectJudgePage.js";
import { SyncProvider } from "./SyncContext.js";
import { TeamPage } from "./TeamPage.js";
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
const accountDataStatusMock = vi.hoisted(() =>
  vi.fn<() => Promise<{ readonly hasSyncedContests: boolean; readonly syncedContestJudges: readonly JudgeProvider[] }>>(async () => ({
    hasSyncedContests: false,
    syncedContestJudges: []
  }))
);
const syncObservers = vi.hoisted(() =>
  new Map<string, Array<{ readonly onData?: (event: any) => void; readonly onError?: (error: any) => void }>>()
);
const syncSnapshots = vi.hoisted(() =>
  new Map<string, any>()
);

const emptySyncStep = () => ({
  status: SyncStepStatus.Pending,
  total: 0,
  processed: 0
});

const emptyProviderState = (provider: JudgeProvider) => ({
  type: PROVIDER_STATE_EVENT_TYPES.State,
  provider,
  status: SyncRunStatus.Idle,
  stepsTotal: 0,
  stepsLeft: 0,
  latestEvent: null,
  summary: null,
  steps: {
    submissions: emptySyncStep(),
    contests: emptySyncStep(),
    regularCatalog: emptySyncStep()
  }
});

const applySyncEvent = (state: any, event: any) => {
  const base = {
    ...state,
    status: event.type === JudgeSyncEventType.Completed
      ? event.summary.errors > 0 ? SyncRunStatus.Error : SyncRunStatus.Completed
      : SyncRunStatus.Running,
    stepsTotal: event.stepsTotal,
    stepsLeft: event.stepsLeft,
    latestEvent: event,
    summary: event.type === JudgeSyncEventType.Completed ? event.summary : state.summary
  };

  if (event.type === JudgeSyncEventType.Step) {
    return {
      ...base,
      steps: {
        ...state.steps,
        [event.step]: {
          status: event.stepStatus,
          total: event.total,
          processed: event.processed,
          current: event.current
        }
      }
    };
  }

  if (event.type === JudgeSyncEventType.Error) {
    return {
      ...base,
      status: SyncRunStatus.Running,
      steps: {
        ...state.steps,
        [event.step ?? JudgeSyncStep.Submissions]: event.step === undefined
          ? state.steps.submissions
          : {
              ...state.steps[event.step],
              status: SyncStepStatus.Error,
              current: event.userHandle ?? event.contestJudgeId
            }
      }
    };
  }

  if (event.type === JudgeSyncEventType.Completed) {
    return {
      ...base,
      steps: {
        submissions: { ...state.steps.submissions, status: SyncStepStatus.Completed, processed: state.steps.submissions.total },
        contests: { ...state.steps.contests, status: SyncStepStatus.Completed, processed: state.steps.contests.total },
        regularCatalog: {
          ...state.steps.regularCatalog,
          status: SyncStepStatus.Completed,
          processed: state.steps.regularCatalog.total
        }
      }
    };
  }

  return base;
};

const syncStateFromFixtureEvents = (provider: JudgeProvider, events: readonly any[]) =>
  events.reduce(applySyncEvent, emptyProviderState(provider));

const syncEvents = (provider: JudgeProvider) => [
  {
    type: JudgeSyncEventType.Started,
    provider,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Submissions,
    stepStatus: SyncStepStatus.Running,
    provider,
    total: 1,
    processed: 0,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Submissions,
    stepStatus: SyncStepStatus.Running,
    provider,
    current: "tourist",
    total: 1,
    processed: 0,
    stepsTotal: 2,
    stepsLeft: 2
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Submissions,
    stepStatus: SyncStepStatus.Completed,
    provider,
    current: "tourist",
    total: 1,
    processed: 1,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Contests,
    stepStatus: SyncStepStatus.Running,
    provider,
    total: 1,
    processed: 0,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Contests,
    stepStatus: SyncStepStatus.Running,
    provider,
    current: "566",
    total: 1,
    processed: 0,
    stepsTotal: 2,
    stepsLeft: 1
  },
  {
    type: JudgeSyncEventType.Step,
    step: JudgeSyncStep.Contests,
    stepStatus: SyncStepStatus.Completed,
    provider,
    current: "566",
    total: 1,
    processed: 1,
    stepsTotal: 2,
    stepsLeft: 0
  },
  {
    type: JudgeSyncEventType.Completed,
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
      regularContestsImported: 0,
      regularProblemsImported: 0,
      regularPendingSubmissionsRetried: 0,
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
  Outlet: () => <div data-testid="route-outlet" />,
  useNavigate: () => navigateMock,
  useRouterState: ({ select }: { readonly select: (state: { readonly location: { readonly pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/find-problems" } })
}));

vi.mock("@clerk/clerk-react", () => ({
  UserButton: () => <button type="button" aria-label="User account" />
}));

vi.mock("./trpc", () => ({
  trpc: {
    account: {
      dataStatus: {
        query: accountDataStatusMock
      }
    },
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
      create: {
        mutate: vi.fn(async () => ({
          codeforces: {
            saved: true
          },
          qoj: {
            saved: true
          }
        }))
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
    team: {
      roster: {
        query: vi.fn(async () => ({
          users: [],
          updatedAt: null
        }))
      },
      add: {
        mutate: vi.fn(async (input) => ({
          users: [
            {
              ...input,
              type: "team"
            }
          ],
          updatedAt: new Date().toISOString()
        }))
      },
      replace: {
        mutate: vi.fn(async (input) => ({
          users: input.users.map((user: { readonly username: string; readonly judge: JudgeProvider }) => ({
            ...user,
            type: "team"
          })),
          updatedAt: new Date().toISOString()
        }))
      }
    },
    judges: {
      startSync: {
        mutate: vi.fn(async ({ provider }: { readonly provider: JudgeProvider }) => {
          queueMicrotask(() => {
            for (const observer of syncObservers.get(provider) ?? []) {
              let state = emptyProviderState(provider);
              for (const event of syncEvents(provider)) {
                state = applySyncEvent(state, event);
                observer.onData?.(state);
              }
            }
          });
        })
      },
      observeSync: {
        subscribe: vi.fn((input: { readonly provider: JudgeProvider }, options) => {
          const observers = syncObservers.get(input.provider) ?? [];
          observers.push(options);
          syncObservers.set(input.provider, observers);
          queueMicrotask(() => {
            options.onData?.(syncSnapshots.get(input.provider) ?? emptyProviderState(input.provider));
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

describe("app shell", () => {
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
    accountDataStatusMock.mockResolvedValue({
      hasSyncedContests: false,
      syncedContestJudges: []
    });
  });

  it("renders the home shell without sync progress while idle", async () => {
    renderWithQuery(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("ICPC Trainer")).toBeInTheDocument());
    expect(screen.getByText("Judges")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sync/i })).toBeInTheDocument();
    expect(screen.queryByText("Judge sync")).not.toBeInTheDocument();
    expect(screen.queryByText("API playground")).not.toBeInTheDocument();
  });

  it("shows separate judge progress while a sync is running", async () => {
    syncSnapshots.set("codeforces", syncStateFromFixtureEvents("codeforces", syncEvents("codeforces").slice(0, 3)));

    renderWithQuery(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Codeforces")).toBeInTheDocument());
    expect(screen.getByText("User submission sync")).toBeInTheDocument();
    expect(screen.getByText("1 user left")).toBeInTheDocument();
    expect(screen.queryByText("Contest sync")).not.toBeInTheDocument();
    expect(screen.queryByText("QOJ")).not.toBeInTheDocument();
  });

  it("starts Codeforces sync from the navbar", async () => {
    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() =>
      expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" })
    );
    await waitFor(() => expect(screen.queryByText("User submission sync")).not.toBeInTheDocument());
  });

  it("refreshes synced data queries after sync completes", async () => {
    renderWithQuery(<ProtectedLayout />);

    await waitFor(() => expect(accountDataStatusMock).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() => expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" }));
    await waitFor(() => expect(accountDataStatusMock).toHaveBeenCalledTimes(2));
  });

  it("shows a sync completion toast with changed data counts", async () => {
    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Codeforces sync complete");
    expect(toast).toHaveTextContent("Contests: 1 new/updated contest");
    expect(toast).toHaveTextContent("Problems: 0 imported problems");
    expect(toast).toHaveTextContent("Submissions: 2 new submissions, 1 updated submission");
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

    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() => expect(trpc.judges.startSync.mutate).toHaveBeenCalledTimes(2));
    expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" });
    expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "qoj" });
  });

  it("warns instead of syncing local judges missing authentication", async () => {
    accountDataStatusMock.mockResolvedValue({
      hasSyncedContests: true,
      syncedContestJudges: ["codeforces", "qoj"]
    });

    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() =>
      expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" })
    );
    expect(trpc.judges.startSync.mutate).not.toHaveBeenCalledWith({ provider: "qoj" });
    expect(await screen.findByText("QOJ authentication is not connected")).toBeInTheDocument();
  });

  it("syncs a newly connected judge even when other judges have local synced contests", async () => {
    accountDataStatusMock.mockResolvedValue({
      hasSyncedContests: true,
      syncedContestJudges: ["qoj"]
    });

    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() =>
      expect(trpc.judges.startSync.mutate).toHaveBeenCalledWith({ provider: "codeforces" })
    );
  });

  it("shows a toast when sync emits an error", async () => {
    vi.mocked(trpc.judges.observeSync.subscribe).mockImplementationOnce((input, options) => {
      const observers = syncObservers.get(input.provider) ?? [];
      observers.push(options);
      syncObservers.set(input.provider, observers);
      queueMicrotask(() => {
        options.onData?.(emptyProviderState(input.provider));
      });
      return { unsubscribe: vi.fn() };
    });
    vi.mocked(trpc.judges.startSync.mutate as any).mockImplementationOnce(async ({ provider }: { readonly provider: JudgeProvider }) => {
      queueMicrotask(() => {
        for (const observer of syncObservers.get(provider) ?? []) {
          let state = emptyProviderState(provider);
          state = applySyncEvent(state, {
          type: JudgeSyncEventType.Error,
          provider,
          phase: JudgeSyncStep.Contests,
          step: JudgeSyncStep.Contests,
          message: {
            code: LOCALIZED_MESSAGE_CODES.SyncOperationFailed,
            params: { judge: provider },
            technicalDetail: "Contest 100566 failed"
          },
          contestJudgeId: "100566",
          stepsTotal: 1,
          stepsLeft: 1
        });
          observer.onData?.(state);
          state = applySyncEvent(state, {
          type: JudgeSyncEventType.Completed,
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
            regularContestsImported: 0,
            regularProblemsImported: 0,
            regularPendingSubmissionsRetried: 0,
            errors: 1
          }
        });
          observer.onData?.(state);
        }
      });
    });

    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sync codeforces");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not sync codeforces data");
  });

  it("stacks sync error toasts and removes the oldest when the stack is full", async () => {
    vi.mocked(trpc.judges.startSync.mutate as any).mockImplementationOnce(async ({ provider }: { readonly provider: JudgeProvider }) => {
      queueMicrotask(() => {
        for (const observer of syncObservers.get(provider) ?? []) {
          let state = emptyProviderState(provider);
          for (const index of Array.from({ length: 8 }, (_, value) => value + 1)) {
            state = applySyncEvent(state, {
            type: JudgeSyncEventType.Error,
            provider,
            phase: JudgeSyncStep.Contests,
            step: JudgeSyncStep.Contests,
            message: {
              code: LOCALIZED_MESSAGE_CODES.SyncOperationFailed,
              params: { judge: provider },
              technicalDetail: `Contest ${index} failed`
            },
            contestJudgeId: String(index),
            stepsTotal: 8,
            stepsLeft: 8 - index
          });
            observer.onData?.(state);
          }
          state = applySyncEvent(state, {
          type: JudgeSyncEventType.Completed,
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
            regularContestsImported: 0,
            regularProblemsImported: 0,
            regularPendingSubmissionsRetried: 0,
            errors: 8
          }
        });
          observer.onData?.(state);
        }
      });
    });

    renderWithQuery(<ProtectedLayout />);

    fireEvent.click(await screen.findByRole("button", { name: /sync/i }));

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(6));
    expect(screen.getAllByText("Could not sync codeforces data.")).toHaveLength(6);
  });

  it("refreshes credential status after clearing connected judges from account", async () => {
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

    renderWithQuery(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: /clear all connected judges/i }));

    await waitFor(() => expect(trpc.credentials.clear.mutate).toHaveBeenCalledWith("codeforces"));
    expect(trpc.credentials.clear.mutate).toHaveBeenCalledWith("qoj");
    await waitFor(() => expect(credentialStatusMock).toHaveBeenCalledTimes(2));
  });

  it("navigates from connect judges to the selected provider page", () => {
    renderWithQuery(<ConnectJudgesPage />);

    fireEvent.click(screen.getByTestId("connect-judges-provider-qoj"));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/connect-judges/qoj" });
  });

  it("links to the Codeforces setup tutorial from the connect judges page", () => {
    renderWithQuery(<CodeforcesConnectJudgePage />);

    const tutorialLink = screen.getByRole("link", { name: /open codeforces setup tutorial/i });
    expect(tutorialLink).toHaveAttribute(
      "href",
      "https://scribehow.com/o/wuKjFIrFRgKoK0RyxQxnQg/viewer/How_to_Create_an_API_Key_on_Codeforces__hvQRpAYRROi3R_6-FTZDiA"
    );
    expect(tutorialLink).toHaveAttribute("target", "_blank");
  });

  it("links to the QOJ setup tutorial from the connect judges page", () => {
    renderWithQuery(<QojConnectJudgePage />);

    const tutorialLink = screen.getByRole("link", { name: /open qoj setup tutorial/i });
    expect(tutorialLink).toHaveAttribute("href", "/connect-judges/qoj/tutorial");
    expect(tutorialLink).not.toHaveAttribute("target");
  });

  it("renders the QOJ setup tutorial steps", () => {
    renderWithQuery(<QojConnectJudgeTutorialPage />);

    expect(screen.getByRole("heading", { name: "Create a QOJ cookie credential" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /credential values redacted/i })).toHaveAttribute(
      "src",
      "/tutorials/qoj/cookie-values-redacted.png"
    );
  });

  it("submits Codeforces credentials when pressing Enter in a credential textarea", async () => {
    renderWithQuery(<CodeforcesConnectJudgePage />);

    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "tourist" } });
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "cf-key" } });
    fireEvent.change(screen.getByLabelText("API secret"), { target: { value: "cf-secret" } });
    fireEvent.keyDown(screen.getByLabelText("API secret"), { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(trpc.credentials.create.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "codeforces",
          providerUserKey: "tourist",
          codeforces: {
            apiKey: "cf-key",
            apiSecret: "cf-secret"
          }
        })
      )
    );
    expect(navigateMock).toHaveBeenCalledWith({ to: "/judges" });
  });

  it("saves structured cookie fields from the QOJ connect judges page", async () => {
    renderWithQuery(<QojConnectJudgePage />);

    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "qoj-user" } });
    fireEvent.change(screen.getByLabelText("uojsessid"), { target: { value: "session" } });
    fireEvent.keyDown(screen.getByLabelText("uojsessid"), { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(trpc.credentials.create.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "qoj",
          providerUserKey: "qoj-user",
          qoj: {
            cookieJar: "uoj_username=qoj-user; uojsessid=session"
          }
        })
      )
    );
    expect(trpc.credentials.save.mutate).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith({ to: "/judges" });
  });

  it("shows a toast with a clearer message when Codeforces connect cannot reach the server", async () => {
    vi.mocked(trpc.credentials.create.mutate).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    renderWithQuery(<CodeforcesConnectJudgePage />);

    fireEvent.change(screen.getByLabelText("Handle"), { target: { value: "tourist" } });
    fireEvent.change(screen.getByLabelText("API key"), { target: { value: "cf-key" } });
    fireEvent.change(screen.getByLabelText("API secret"), { target: { value: "cf-secret" } });
    fireEvent.click(screen.getByRole("button", { name: /enter/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not connect Codeforces");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the ICPC Trainer server");
  });

  it("shows a localized conflict when adding a duplicate team user", async () => {
    vi.mocked(trpc.team.add.mutate).mockRejectedValueOnce(
      Object.assign(new Error("tourist is already saved as a team user."), {
        data: { code: "CONFLICT" }
      })
    );

    renderWithQuery(<TeamPage />);

    fireEvent.change(await screen.findByLabelText("Handle"), { target: { value: "tourist" } });
    fireEvent.click(screen.getByRole("button", { name: /add user/i }));

    await waitFor(() =>
      expect(trpc.team.add.mutate).toHaveBeenCalledWith({
        username: "tourist",
        judge: "codeforces"
      })
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("That change conflicts with newer data");
  });

  it("renders the playground without the shared navbar and with saved credentials only", async () => {
    renderWithQuery(<PlaygroundPage />);

    expect(await screen.findByText("API playground")).toBeInTheDocument();
    expect(screen.queryByText("ICPC Trainer")).not.toBeInTheDocument();
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
