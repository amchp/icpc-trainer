import type { AppRouter } from "@icpc-trainer/api";
import { createTRPCClient, createWSClient, httpBatchLink, splitLink, type TRPCClient, wsLink } from "@trpc/client";

const resolveBaseUrl = (): string => {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(/\/$/, "");
  }
  return "";
};

const resolveWsUrl = (): string => {
  const baseUrl = resolveBaseUrl();
  if (baseUrl !== "") {
    return `${baseUrl.replace(/^http/, "ws")}/trpc`;
  }

  return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/trpc`;
};

export const trpc: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (operation) => operation.type === "subscription",
      true: wsLink({
        client: createWSClient({
          url: resolveWsUrl()
        })
      }),
      false: httpBatchLink({
        url: `${resolveBaseUrl()}/trpc`
      })
    })
  ]
});
