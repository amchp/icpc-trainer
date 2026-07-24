import { isAppLocale, type AppLocale } from "@icpc-trainer/shared";
import { appUsers } from "@icpc-trainer/db";
import type { initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getAccountDataStatus } from "./accountReadModel.js";
import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createAccountRouter = (t: TrpcInstance) =>
  t.router({
    dataStatus: t.procedure.query(({ ctx }) => getAccountDataStatus(ctx.database, requireAppUser(ctx.appUser).id)),
    locale: t.procedure.query(async ({ ctx }): Promise<{ locale: AppLocale | null }> => {
      const appUser = requireAppUser(ctx.appUser);
      const row = await ctx.database.db
        .select({ locale: appUsers.preferredLocale })
        .from(appUsers)
        .where(eq(appUsers.id, appUser.id))
        .get();
      return { locale: row?.locale ?? null };
    }),
    setLocale: t.procedure
      .input(z.object({ locale: z.custom<AppLocale>((value) => typeof value === "string" && isAppLocale(value)) }))
      .mutation(async ({ ctx, input }): Promise<{ locale: AppLocale }> => {
        const appUser = requireAppUser(ctx.appUser);
        const now = new Date();
        await ctx.database.db
          .update(appUsers)
          .set({ preferredLocale: input.locale, updatedAt: now })
          .where(eq(appUsers.id, appUser.id))
          .run();
        ctx.analytics?.identify({
          distinctId: appUser.clerkUserId,
          properties: { locale: input.locale }
        });
        return { locale: input.locale };
      })
  });

export type { AppDataStatus } from "./accountReadModel.js";
