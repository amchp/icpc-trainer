import { TRPCError, type initTRPC } from "@trpc/server";

import type { ApiContext } from "./index.js";

export type PlaygroundProvider = "codeforces" | "qoj";
export type PlaygroundOperation = "contests" | "contest" | "user" | "submissions";

export interface PlaygroundInput {
  readonly provider: PlaygroundProvider;
  readonly operation: PlaygroundOperation;
  readonly contestId?: string;
  readonly userHandle?: string;
  readonly codeforces?: {
    readonly apiKey?: string;
    readonly apiSecret?: string;
  };
  readonly qoj?: {
    readonly cookieJar?: string;
  };
}

export interface JudgePlaygroundService {
  readonly run: (input: PlaygroundInput) => Promise<PlaygroundResult>;
}

export type PlaygroundResult =
  | {
      readonly ok: true;
      readonly result: unknown;
    }
  | {
      readonly ok: false;
      readonly error: PlaygroundError;
    };

export interface PlaygroundError {
  readonly message: string;
  readonly tag?: string;
  readonly judgeId?: string;
  readonly resource?: "contest" | "user";
  readonly cause?: string;
  readonly causeType?: string;
  readonly raw?: unknown;
}

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createPlaygroundRouter = (t: TrpcInstance) =>
  t.router({
    run: t.procedure.input((value) => parsePlaygroundInput(value)).mutation(async ({ ctx, input }) => {
      try {
        return await ctx.judges.run(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
          cause: error
        });
      }
    })
  });

const parsePlaygroundInput = (value: unknown): PlaygroundInput => {
  if (typeof value !== "object" || value === null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Playground input must be an object." });
  }

  const input = value as Record<string, unknown>;
  const provider = input.provider;
  const operation = input.operation;

  if (provider !== "codeforces" && provider !== "qoj") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose codeforces or qoj." });
  }

  if (
    operation !== "contests" &&
    operation !== "contest" &&
    operation !== "user" &&
    operation !== "submissions"
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a supported operation." });
  }

  return {
    provider,
    operation,
    contestId: readString(input.contestId),
    userHandle: readString(input.userHandle),
    codeforces: readCodeforces(input.codeforces),
    qoj: readQoj(input.qoj)
  };
};

const readString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const readCodeforces = (value: unknown): PlaygroundInput["codeforces"] => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const input = value as Record<string, unknown>;

  return {
    apiKey: readString(input.apiKey),
    apiSecret: readString(input.apiSecret)
  };
};

const readQoj = (value: unknown): PlaygroundInput["qoj"] => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const input = value as Record<string, unknown>;

  return {
    cookieJar: readString(input.cookieJar)
  };
};
