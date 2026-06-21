import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomeRoute } from "./HomeRoute.js";

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
    }
  }
}));

describe("HomeRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mocked health and starter table rows", async () => {
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
    expect(screen.getAllByText("Electron wrapper").length).toBeGreaterThan(0);
  });
});
