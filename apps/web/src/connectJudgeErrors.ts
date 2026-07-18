import { i18n } from "./i18n/i18n.js";
import { localizedErrorMessage } from "./i18n/localizedMessage.js";

const networkErrorPattern = /failed to fetch|fetch failed|networkerror|load failed/i;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const trpcErrorCode = (error: unknown): unknown =>
  error !== null && typeof error === "object" && "data" in error
    ? (error as { readonly data?: { readonly code?: unknown } }).data?.code
    : undefined;

export const formatConnectJudgeError = (error: unknown): string => {
  const message = getErrorMessage(error);

  if (networkErrorPattern.test(message)) {
    return i18n.t("serverUnavailable", { ns: "judges" });
  }

  if (trpcErrorCode(error) === "BAD_REQUEST") {
    return i18n.t("invalidCredentials", { ns: "judges" });
  }

  return message.trim() === "" ? i18n.t("connectionFailed", { ns: "judges" }) : localizedErrorMessage(error);
};
