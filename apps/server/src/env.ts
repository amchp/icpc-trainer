import { createEnv } from "@t3-oss/env-core";
import process from "node:process";
import { z } from "zod";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmedString = z.preprocess(blankToUndefined, z.string().trim().optional());
const trimmedStringWithDefault = (defaultValue: string) =>
  z.preprocess(blankToUndefined, z.string().trim().default(defaultValue));

export const createServerEnv = (runtimeEnv: NodeJS.ProcessEnv = process.env) =>
  createEnv({
    server: {
      ICPC_TRAINER_HOST: trimmedStringWithDefault("127.0.0.1"),
      ICPC_TRAINER_PORT: z.coerce.number().int().min(1).max(65535).default(3773),
      ICPC_TRAINER_DATABASE_URL: optionalTrimmedString,
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: optionalTrimmedString,
      ICPC_TRAINER_SQLITE_PATH: optionalTrimmedString,
      ICPC_TRAINER_CREDENTIAL_KEY: optionalTrimmedString,
      ICPC_TRAINER_CREDENTIAL_KEY_FILE: optionalTrimmedString,
      CLERK_SECRET_KEY: optionalTrimmedString,
      CLERK_PUBLISHABLE_KEY: optionalTrimmedString,
      CLERK_JWT_KEY: optionalTrimmedString,
      CLERK_ALLOWED_ORIGINS: optionalTrimmedString
    },
    clientPrefix: "VITE_",
    client: {
      VITE_CLERK_PUBLISHABLE_KEY: optionalTrimmedString
    },
    runtimeEnv,
    emptyStringAsUndefined: true
  });

export type ServerEnv = ReturnType<typeof createServerEnv>;
