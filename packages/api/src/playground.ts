import { TRPCError, type initTRPC } from "@trpc/server";
import {
  JUDGE_RESOURCES,
  PLAYGROUND_OPERATION_VALUES,
  type JudgeResource,
  type PlaygroundOperation
} from "@icpc-trainer/shared";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";
import { judgeProviderSchema } from "./judgeProvider.js";

const optionalTrimmedString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

export const playgroundInputSchema = z.object({
  provider: judgeProviderSchema,
  operation: z.enum(PLAYGROUND_OPERATION_VALUES),
  contestId: optionalTrimmedString,
  userHandle: optionalTrimmedString
});

export type PlaygroundInput = z.infer<typeof playgroundInputSchema>;
export type AppScopedPlaygroundInput = PlaygroundInput & {
  readonly appUserId: number;
};
export type PlaygroundProvider = PlaygroundInput["provider"];
export type { PlaygroundOperation };

export interface JudgePlaygroundService {
  readonly run: (input: AppScopedPlaygroundInput) => Promise<PlaygroundResult>;
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
  readonly resource?: JudgeResource;
  readonly cause?: string;
  readonly causeType?: string;
  readonly raw?: unknown;
}

export { JUDGE_RESOURCES as JudgeResource };

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createPlaygroundRouter = (t: TrpcInstance) =>
  t.router({
    run: t.procedure.input(playgroundInputSchema).mutation(async ({ ctx, input }) => {
      const appUser = requireAppUser(ctx.appUser);
      try {
        return await ctx.judges.run({ ...input, appUserId: appUser.id });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
          cause: error
        });
      }
    })
  });
