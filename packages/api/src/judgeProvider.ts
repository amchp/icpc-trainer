import { JUDGE_PROVIDERS } from "@icpc-trainer/shared";
import { z } from "zod";

export const judgeProviderSchema = z.enum(JUDGE_PROVIDERS);
