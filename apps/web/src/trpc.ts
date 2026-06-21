import type { AppRouter } from "@icpc-trainer/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

const resolveBaseUrl = (): string => {
  const value = import.meta.env.VITE_API_BASE_URL;
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(/\/$/, "");
  }
  return "";
};

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${resolveBaseUrl()}/trpc`
    })
  ]
});
