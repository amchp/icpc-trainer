import { JUDGES } from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { encryptCredential } from "./credentialCrypto.js";
import {
  clearCredentials,
  getCredentialStatus,
  saveEncryptedCredential,
  type CredentialStatus,
  type SaveCredentialsInput
} from "./credentialRepository.js";
import type { ApiContext } from "./index.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const optionalTrimmedString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const requiredTrimmedString = (message: string) => z.string().trim().min(1, message);

const providerSchema = z.enum(["codeforces", "qoj"]);

export const saveCredentialsInputSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("codeforces"),
    providerUserKey: optionalTrimmedString,
    codeforces: z.object({
      apiKey: requiredTrimmedString("Codeforces apiKey is required to save credentials."),
      apiSecret: requiredTrimmedString("Codeforces apiSecret is required to save credentials.")
    })
  }),
  z.object({
    provider: z.literal("qoj"),
    providerUserKey: optionalTrimmedString,
    qoj: z.object({
      cookieJar: requiredTrimmedString("QOJ cookie jar is required to save credentials.")
    })
  })
]);

export const createCredentialsRouter = (t: TrpcInstance) =>
  t.router({
    status: t.procedure.query(({ ctx }): CredentialStatus => getCredentialStatus(ctx)),
    events: t.procedure.subscription(async function* ({ ctx }) {
      const events = ctx.credentialEvents?.subscribe();
      yield {
        type: "snapshot" as const,
        status: getCredentialStatus(ctx),
        occurredAt: new Date().toISOString()
      };

      if (events !== undefined) {
        yield* events;
      }
    }),
    save: t.procedure.input(saveCredentialsInputSchema).mutation(async ({ ctx, input }): Promise<CredentialStatus> => {
      try {
        await ctx.judges.validateCredentials(input);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : String(error),
          cause: error
        });
      }

      const payload = input.provider === JUDGES.Codeforces
        ? JSON.stringify(input.codeforces)
        : JSON.stringify(input.qoj);

      const status = saveEncryptedCredential(ctx, input, encryptCredential(payload));
      ctx.credentialEvents?.publish({
        type: "changed",
        status,
        occurredAt: new Date().toISOString()
      });
      return status;
    }),
    clear: t.procedure.input(providerSchema).mutation(({ ctx, input }): CredentialStatus => {
      const status = clearCredentials(ctx, input);
      ctx.credentialEvents?.publish({
        type: "changed",
        status,
        occurredAt: new Date().toISOString()
      });
      return status;
    })
  });

export type {
  CredentialStatus,
  SaveCredentialsInput
} from "./credentialRepository.js";
