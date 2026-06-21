import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeRoute } from "./HomeRoute.js";
import { trpc } from "./trpc.js";

vi.mock("./trpc", () => ({
  trpc: {
    health: {
      ping: {
        query: vi.fn(async () => ({
          ok: true,
          service: "icpc-trainer",
          database: "ok",
          timestamp: "2026-06-20T12:00:00.000Z"
        }))
      }
    },
    playground: {
      run: {
        mutate: vi.fn(async () => ({ ok: true }))
      }
    }
  }
}));

describe("HomeRoute", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders mocked health and API playground controls", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <HomeRoute />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "ICPC Trainer" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("icpc-trainer")).toBeInTheDocument());
    expect(screen.getByText("Drizzle SQLite")).toBeInTheDocument();
    expect(screen.getByText("API playground")).toBeInTheDocument();
    expect(screen.getByText("Authenticated judges")).toBeInTheDocument();
  });

  it("sends QOJ cookies from the structured cookie fields", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    render(
      <QueryClientProvider client={queryClient}>
        <HomeRoute />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Provider"), { target: { value: "qoj" } });
    fireEvent.change(screen.getByLabelText("Operation"), { target: { value: "contests" } });
    fireEvent.change(screen.getByLabelText("uoj_username"), { target: { value: "qoj-user" } });
    fireEvent.change(screen.getByLabelText("uojsessid"), { target: { value: "session" } });
    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    await waitFor(() =>
      expect(trpc.playground.run.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "qoj",
          qoj: {
            cookieJar: "uoj_username=qoj-user; uojsessid=session"
          }
        })
      )
    );
  });
});
