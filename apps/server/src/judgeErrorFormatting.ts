import { JUDGE_RESOURCES } from "@icpc-trainer/shared";

import type { JudgeError } from "../judges/judges.js";

type RecordLike = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordLike =>
  typeof value === "object" && value !== null;

export const causeMessage = (cause: unknown): string | undefined => {
  if (cause === undefined || cause === null) {
    return undefined;
  }

  if (typeof cause === "string") {
    return cause;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  if (typeof cause === "object" && "comment" in cause && typeof cause.comment === "string") {
    return cause.comment;
  }

  return String(cause);
};

export const causeType = (cause: unknown): string | undefined => {
  if (cause === undefined || cause === null) {
    return undefined;
  }

  return cause instanceof Error ? cause.name : typeof cause;
};

export const formatJudgeError = (error: JudgeError): string => {
  const detail = "cause" in error ? causeMessage(error.cause) : undefined;
  const suffix = detail === undefined || detail === "" ? "" : ` ${detail}`;

  switch (error._tag) {
    case "JudgeCredentialError":
      return `Credential error for ${error.judgeId}.${suffix}`;
    case "JudgeNotFoundError":
      return `${error.resource === JUDGE_RESOURCES.Contest ? "Contest" : "User"} not found on judge: ${error.judgeId}.`;
    case "JudgeAPIError":
      return `Judge API rejected the request for ${error.judgeId}.${suffix}`;
    case "JudgeUnavailableError":
      return `Judge is unavailable for ${error.judgeId}.${suffix}`;
  }
};

export const isJudgeError = (error: unknown): error is JudgeError =>
  isRecord(error) &&
  typeof error._tag === "string" &&
  ["JudgeCredentialError", "JudgeNotFoundError", "JudgeAPIError", "JudgeUnavailableError"].includes(error._tag);

export const unwrapEffectFailure = (error: unknown): unknown => {
  if (!isRecord(error)) {
    return error;
  }

  const causeSymbol = Object.getOwnPropertySymbols(error)
    .find((symbol) => String(symbol) === "Symbol(effect/Runtime/FiberFailure/Cause)");
  const cause = causeSymbol === undefined
    ? undefined
    : (error as Record<PropertyKey, unknown>)[causeSymbol];
  if (!isRecord(cause)) {
    return error;
  }

  if ("error" in cause) {
    return cause.error;
  }

  if ("failure" in cause) {
    return cause.failure;
  }

  return error;
};

