import { z } from "zod";

export const listInputSchema = z.object({
  limit: z.number().int().positive().max(50).optional()
}).optional();
