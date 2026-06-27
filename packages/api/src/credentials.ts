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
import { requireAppUser } from "./appUsers.js";
import { judgeProviderSchema } from "./judgeProvider.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const optionalTrimmedString = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const requiredTrimmedString = (message: string) => z.string().trim().min(1, message);

const credentialPayloadFor = (input: SaveCredentialsInput): string =>
  input.provider === JUDGES.Codeforces
    ? JSON.stringify(input.codeforces)
    : JSON.stringify(input.qoj);

const validateCredentials = async (ctx: ApiContext, input: SaveCredentialsInput): Promise<void> => {
  try {
    await ctx.judges.validateCredentials(input);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : String(error),
      cause: error
    });
  }
};

const publishCredentialChange = (ctx: ApiContext, status: CredentialStatus): void => {
  const appUser = requireAppUser(ctx.appUser);
  ctx.credentialEvents?.publish({
    type: "changed",
    appUserId: appUser.id,
    status,
    occurredAt: new Date().toISOString()
  });
};

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
    status: t.procedure.query(({ ctx }): Promise<CredentialStatus> =>
      getCredentialStatus({ database: ctx.database, appUserId: requireAppUser(ctx.appUser).id })
    ),
    events: t.procedure.subscription(async function* ({ ctx }) {
      const appUser = requireAppUser(ctx.appUser);
      const events = ctx.credentialEvents?.subscribe();
      yield {
        type: "snapshot" as const,
        appUserId: appUser.id,
        status: await getCredentialStatus({ database: ctx.database, appUserId: appUser.id }),
        occurredAt: new Date().toISOString()
      };

      if (events !== undefined) {
        for await (const event of events) {
          if (event.appUserId === appUser.id) {
            yield event;
          }
        }
      }
    }),
    create: t.procedure.input(saveCredentialsInputSchema).mutation(async ({ ctx, input }): Promise<CredentialStatus> => {
      const appUser = requireAppUser(ctx.appUser);
      const credentialContext = { database: ctx.database, appUserId: appUser.id };
      await validateCredentials(ctx, input);

      const status = await saveEncryptedCredential(credentialContext, input, encryptCredential(credentialPayloadFor(input)));
      publishCredentialChange(ctx, status);
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "judge_credentials_saved",
        properties: { provider: input.provider, has_provider_user_key: input.providerUserKey !== undefined }
      });
      return status;
    }),
    save: t.procedure.input(saveCredentialsInputSchema).mutation(async ({ ctx, input }): Promise<CredentialStatus> => {
      const appUser = requireAppUser(ctx.appUser);
      const credentialContext = { database: ctx.database, appUserId: appUser.id };
      await validateCredentials(ctx, input);

      const status = await saveEncryptedCredential(credentialContext, input, encryptCredential(credentialPayloadFor(input)));
      publishCredentialChange(ctx, status);
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "judge_credentials_saved",
        properties: { provider: input.provider, has_provider_user_key: input.providerUserKey !== undefined }
      });
      return status;
    }),
    clear: t.procedure.input(judgeProviderSchema).mutation(async ({ ctx, input }): Promise<CredentialStatus> => {
      const appUser = requireAppUser(ctx.appUser);
      const status = await clearCredentials({ database: ctx.database, appUserId: appUser.id }, input);
      ctx.credentialEvents?.publish({
        type: "changed",
        appUserId: appUser.id,
        status,
        occurredAt: new Date().toISOString()
      });
      ctx.analytics?.capture({
        distinctId: appUser.clerkUserId,
        event: "judge_credentials_cleared",
        properties: { provider: input }
      });
      return status;
    })
  });

export type {
  CredentialStatus,
  SaveCredentialsInput
} from "./credentialRepository.js";
