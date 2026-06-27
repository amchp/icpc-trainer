import { createEnv } from "@t3-oss/env-core";
import process from "node:process";
import { z } from "zod";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmedString = z.preprocess(blankToUndefined, z.string().trim().optional());
const optionalPort = z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(65535).optional());

export const createServerEnv = (runtimeEnv: NodeJS.ProcessEnv = process.env) =>
  createEnv({
    server: {
      PORT: optionalPort,
      ICPC_TRAINER_HOST: optionalTrimmedString,
      ICPC_TRAINER_PORT: optionalPort,
      ICPC_TRAINER_DATABASE_URL: optionalTrimmedString,
      ICPC_TRAINER_DATABASE_AUTH_TOKEN: optionalTrimmedString,
      ICPC_TRAINER_SQLITE_PATH: optionalTrimmedString,
      ICPC_TRAINER_CREDENTIAL_KEY: optionalTrimmedString,
      TASK_TOKEN: optionalTrimmedString,
      POSTHOG_API_KEY: optionalTrimmedString,
      POSTHOG_HOST: optionalTrimmedString,
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
