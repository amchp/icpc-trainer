import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectJudgesPage } from "./ConnectJudgesPage.js";
import { ConnectedJudgesProvider } from "./ConnectedJudgesContext.js";
import { HomeRoute } from "./HomeRoute.js";
import { PlaygroundPage } from "./PlaygroundPage.js";
import { QojConnectJudgePage } from "./QojConnectJudgePage.js";
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
      <ConnectedJudgesProvider>{ui}</ConnectedJudgesProvider>
    </QueryClientProvider>
  );
};

describe("HomeRoute", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    credentialStatusMock.mockResolvedValue({
      codeforces: {
        saved: true
      },
      qoj: {
        saved: false
      }
    });
  });

  it("renders an empty home shell with a profile button", async () => {
    renderWithQuery(<HomeRoute />);

    await waitFor(() => expect(screen.getByText("ICPC Trainer")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: /codeforces/i })).toBeInTheDocument());
    expect(screen.queryByText("API playground")).not.toBeInTheDocument();
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
