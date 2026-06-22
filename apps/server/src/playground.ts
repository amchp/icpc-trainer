import {
  clearStoredCredentials,
  type JudgePlaygroundService,
  type PlaygroundError,
  type PlaygroundInput,
  type PlaygroundResult
} from "@icpc-trainer/api";
import { DatabaseServiceTag, type DatabaseService } from "@icpc-trainer/db";
import { Effect } from "effect";

import { makeCodeforcesJudge } from "../judges/codeforces.js";
import type { JudgeError } from "../judges/judges.js";
import { makeQojJudge } from "../judges/qoj.js";

const requiredInput = (value: string | undefined, label: string): string => {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
};

const toJsonValue = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const causeMessage = (cause: unknown): string | undefined => {
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

const causeType = (cause: unknown): string | undefined => {
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
      return `${error.resource === "contest" ? "Contest" : "User"} not found on judge: ${error.judgeId}.`;
    case "JudgeAPIError":
      return `Judge API rejected the request for ${error.judgeId}.${suffix}`;
    case "JudgeUnavailableError":
      return `Judge is unavailable for ${error.judgeId}.${suffix}`;
  }
};

export const toPlaygroundError = (error: JudgeError): PlaygroundError => {
  const cause = "cause" in error ? error.cause : undefined;
  const base = {
    message: formatJudgeError(error),
    tag: error._tag,
    cause: causeMessage(cause),
    causeType: causeType(cause),
    raw: toJsonValue(error)
  };

  switch (error._tag) {
    case "JudgeCredentialError":
    case "JudgeAPIError":
    case "JudgeUnavailableError":
      return {
        ...base,
        judgeId: error.judgeId
      };
    case "JudgeNotFoundError":
      return {
        ...base,
        judgeId: error.judgeId,
        resource: error.resource
      };
  }
};

const toPlaygroundResult = async <T>(
  database: DatabaseService,
  input: PlaygroundInput,
  effect: Effect.Effect<T, JudgeError, never>
): Promise<PlaygroundResult> =>
  Effect.runPromise(
    effect.pipe(
      Effect.match({
        onFailure: (error) => {
          if (error._tag === "JudgeCredentialError") {
            clearStoredCredentials({ database }, input.provider);
          }

          return { ok: false as const, error: toPlaygroundError(error) };
        },
        onSuccess: (value) => ({ ok: true as const, result: toJsonValue(value) })
      })
    )
  );

const runPlaygroundEffect = async <T>(
  database: DatabaseService,
  input: PlaygroundInput,
  effect: Effect.Effect<T, JudgeError, DatabaseServiceTag>,
): Promise<PlaygroundResult> => {
  const provided = Effect.provideService(effect, DatabaseServiceTag, database);
  return await toPlaygroundResult(database, input, provided);
};

export const createJudgePlayground = (database: DatabaseService): JudgePlaygroundService => {
  return {
    run: async (input) => {
      const judge = input.provider === "codeforces"
        ? makeCodeforcesJudge()
        : makeQojJudge();

      if (input.operation === "contests") {
        return await runPlaygroundEffect(database, input, judge.getContests({ userHandle: input.userHandle }));
      }

      if (input.operation === "contest") {
        return await runPlaygroundEffect(
          database,
          input,
          judge.getContest(requiredInput(input.contestId, "Contest ID"))
        );
      }

      if (input.operation === "user") {
        return await runPlaygroundEffect(
          database,
          input,
          judge.getUser(requiredInput(input.userHandle, "User handle"))
        );
      }

      return await runPlaygroundEffect(
        database,
        input,
        judge.getSubmissions({ userHandle: requiredInput(input.userHandle, "User handle") })
      );
    }
  };
};
