import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ProtectedLayout } from "./ProtectedLayout.js";
import { AuthenticatedLocaleSync } from "./i18n/AuthenticatedLocaleSync.js";

const requests = vi.hoisted(() => ({ locale: vi.fn(), table: vi.fn() }));
vi.mock("@clerk/clerk-react", () => ({ useAuth: () => ({ userId: "startup-user" }) }));
vi.mock("./trpc.js", () => ({ trpc: { account: {
  locale: { query: requests.locale }, setLocale: { mutate: vi.fn() }
} } }));
vi.mock("./AppHeader.js", () => ({ AppHeader: () => null }));
vi.mock("./SyncContext.js", () => ({ useSync: () => ({ status: "idle" }) }));
vi.mock("./ConnectedJudgesContext.js", () => ({
  useConnectedJudges: () => ({ status: "loading", hasConnectedJudge: false })
}));
vi.mock("@tanstack/react-router", () => ({ Outlet: () => <TableRoute /> }));

function TableRoute() {
  const result = useQuery({ queryKey: ["startup-test"], queryFn: requests.table });
  return <p>{result.data ?? "Table loading"}</p>;
}

afterEach(cleanup);

it("starts and renders table data while locale and judge status are still pending", async () => {
  let resolveLocale!: (value: { locale: string }) => void;
  requests.locale.mockReturnValue(new Promise((resolve) => { resolveLocale = resolve; }));
  requests.table.mockResolvedValue("Table ready");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <AuthenticatedLocaleSync><ProtectedLayout /></AuthenticatedLocaleSync>
  </QueryClientProvider>);
  expect(await screen.findByText("Table ready")).toBeInTheDocument();
  expect(requests.locale).toHaveBeenCalledTimes(1);
  expect(client.getQueryState(["account", "locale", "startup-user"])?.fetchStatus).toBe("fetching");
  await act(async () => resolveLocale({ locale: "en" }));
  await waitFor(() => expect(client.getQueryState(["account", "locale", "startup-user"])?.status).toBe("success"));
  expect(requests.table).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Table ready")).toBeInTheDocument();
});
