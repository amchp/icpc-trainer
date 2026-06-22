import { TRPCError, type initTRPC } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";

const optionalTrimmedString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

export const playgroundInputSchema = z.object({
  provider: z.enum(["codeforces", "qoj"]),
  operation: z.enum(["contests", "contest", "user", "submissions"]),
  contestId: optionalTrimmedString,
  userHandle: optionalTrimmedString
});

export type PlaygroundInput = z.infer<typeof playgroundInputSchema>;
export type PlaygroundProvider = PlaygroundInput["provider"];
export type PlaygroundOperation = PlaygroundInput["operation"];

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
    run: t.procedure.input(playgroundInputSchema).mutation(async ({ ctx, input }) => {
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
