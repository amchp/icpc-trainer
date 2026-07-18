import {
  LOCALIZED_MESSAGE_CODES,
  type LocalizedMessageReference
} from "@icpc-trainer/shared";

import { i18n } from "./i18n.js";

const translate = (key: string, params: Readonly<Record<string, string | number>> = {}): string =>
  String(i18n.t(key as never, params as never));

const isLocalizedMessageReference = (value: unknown): value is LocalizedMessageReference => {
  if (value === null || typeof value !== "object" || !("code" in value)) {
    return false;
  }

  return Object.values(LOCALIZED_MESSAGE_CODES).includes(
    (value as { readonly code: string }).code as LOCALIZED_MESSAGE_CODES
  );
};

export const localizedMessageText = (message: LocalizedMessageReference): string => {
  const params = message.params ?? {};
  switch (message.code) {
    case LOCALIZED_MESSAGE_CODES.Unauthorized:
      return translate("common:error.unauthorized", params);
    case LOCALIZED_MESSAGE_CODES.Forbidden:
      return translate("common:error.forbidden", params);
    case LOCALIZED_MESSAGE_CODES.NotFound:
      return translate("common:error.notFound", params);
    case LOCALIZED_MESSAGE_CODES.Conflict:
      return translate("common:error.conflict", params);
    case LOCALIZED_MESSAGE_CODES.RateLimited:
      return translate("common:error.rateLimited", params);
    case LOCALIZED_MESSAGE_CODES.Unavailable:
      return translate("common:error.unavailable", params);
    case LOCALIZED_MESSAGE_CODES.SyncOperationFailed:
      return translate("common:error.syncOperationFailed", params);
    case LOCALIZED_MESSAGE_CODES.SyncNotImplemented:
      return translate("common:error.syncNotImplemented", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncPreparing:
      return translate("common:error.friendSyncPreparing", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncNoFriends:
      return translate("common:error.friendSyncNoFriends", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncing:
      return translate("common:error.friendSyncing", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncingHandle:
      return translate("common:error.friendSyncingHandle", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncedHandle:
      return translate("common:error.friendSyncedHandle", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncStatusUnavailable:
      return translate("common:error.friendSyncStatusUnavailable", params);
    case LOCALIZED_MESSAGE_CODES.FriendSyncWarning:
      return translate("common:error.friendSyncWarning", {
        ...params,
        target: typeof params.handle === "string" && params.handle.length > 0
          ? i18n.language === "es" ? ` de ${params.handle}` : ` for ${params.handle}`
          : ""
      });
    case LOCALIZED_MESSAGE_CODES.GenericError:
      return translate("common:error.genericDescription", params);
  }

  return translate("common:error.genericDescription");
};

const localizedCodeForTrpcError = (code: unknown): LocalizedMessageReference["code"] => {
  switch (code) {
    case "UNAUTHORIZED":
      return LOCALIZED_MESSAGE_CODES.Unauthorized;
    case "FORBIDDEN":
      return LOCALIZED_MESSAGE_CODES.Forbidden;
    case "NOT_FOUND":
      return LOCALIZED_MESSAGE_CODES.NotFound;
    case "CONFLICT":
      return LOCALIZED_MESSAGE_CODES.Conflict;
    case "TOO_MANY_REQUESTS":
      return LOCALIZED_MESSAGE_CODES.RateLimited;
    case "TIMEOUT":
    case "CLIENT_CLOSED_REQUEST":
      return LOCALIZED_MESSAGE_CODES.Unavailable;
    default:
      return LOCALIZED_MESSAGE_CODES.GenericError;
  }
};

export const localizedErrorMessage = (error: unknown): string => {
  if (error !== null && typeof error === "object" && "data" in error) {
    const data = (error as { readonly data?: unknown }).data;
    if (data !== null && typeof data === "object" && "localizedMessage" in data) {
      const localizedMessage = (data as { readonly localizedMessage?: unknown }).localizedMessage;
      if (isLocalizedMessageReference(localizedMessage)) {
        return localizedMessageText(localizedMessage);
      }
    }

    if (data !== null && typeof data === "object" && "code" in data) {
      return localizedMessageText({
        code: localizedCodeForTrpcError((data as { readonly code?: unknown }).code)
      });
    }
  }

  return translate("common:error.genericDescription");
};
