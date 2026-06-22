import { JUDGES } from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
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
    save: t.procedure.input(saveCredentialsInputSchema).mutation(({ ctx, input }): CredentialStatus => {
      const payload = input.provider === JUDGES.Codeforces
        ? JSON.stringify(input.codeforces)
        : JSON.stringify(input.qoj);

      return saveEncryptedCredential(ctx, input, encryptCredential(payload));
    }),
    clear: t.procedure.input(providerSchema).mutation(({ ctx, input }): CredentialStatus =>
      clearCredentials(ctx, input)
    )
  });

export type {
  CredentialStatus,
  SaveCredentialsInput
} from "./credentialRepository.js";
