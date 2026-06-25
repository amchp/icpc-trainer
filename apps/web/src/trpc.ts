import type { AppRouter } from "@icpc-trainer/api";
import {
  createTRPCClient,
  createWSClient,
  httpBatchLink,
  splitLink,
  type TRPCClient,
  type TRPCWebSocketClient,
  wsLink
} from "@trpc/client";

type AuthTokenGetter = () => Promise<string | null>;

let authTokenGetter: AuthTokenGetter = async () => null;
let wsClient: TRPCWebSocketClient | null = null;

export const setAuthTokenGetter = (getter: AuthTokenGetter): void => {
  authTokenGetter = getter;
};

export const setAuthToken = (token: string | null, getter: AuthTokenGetter = async () => token): void => {
  authTokenGetter = getter;
  if (wsClient !== null) {
    void wsClient.close().catch(() => undefined);
    wsClient = null;
  }
};

const getAuthToken = async (): Promise<string | null> => await authTokenGetter();

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return token === null ? {} : { authorization: `Bearer ${token}` };
};

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

const getWsClient = (): TRPCWebSocketClient => {
  wsClient ??= createWSClient({
    url: resolveWsUrl(),
    connectionParams: async () => {
      const token = await getAuthToken();
      return token === null ? {} : { token };
    }
  });

  return wsClient;
};

const wsClientProxy = {
  close: () => getWsClient().close(),
  request: (options: Parameters<TRPCWebSocketClient["request"]>[0]) => getWsClient().request(options),
  get connectionState() {
    return getWsClient().connectionState;
  }
} as TRPCWebSocketClient;

export const trpc: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    splitLink({
      condition: (operation) => operation.type === "subscription",
      true: wsLink({
        client: wsClientProxy
      }),
      false: httpBatchLink({
        url: `${resolveBaseUrl()}/trpc`,
        headers: authHeaders
      })
    })
  ]
});
