import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalTrimmedString = z.preprocess(blankToUndefined, z.string().trim().optional());
const firstNonBlank = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => typeof value === "string" && value.trim() !== "");

export const env = createEnv({
  server: {},
  clientPrefix: "VITE_",
  client: {
    VITE_API_BASE_URL: optionalTrimmedString,
    VITE_CLERK_PUBLISHABLE_KEY: z.string().trim().min(1)
  },
  runtimeEnv: {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_CLERK_PUBLISHABLE_KEY: firstNonBlank(
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      import.meta.env.CLERK_PUBLISHABLE_KEY,
    )
  },
  skipValidation: import.meta.env.MODE === "test",
  emptyStringAsUndefined: true
});
