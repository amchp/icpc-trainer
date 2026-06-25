import type { initTRPC } from "@trpc/server";

import { getAccountDataStatus } from "./accountReadModel.js";
import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createAccountRouter = (t: TrpcInstance) =>
  t.router({
    dataStatus: t.procedure.query(({ ctx }) => getAccountDataStatus(ctx.database, requireAppUser(ctx.appUser).id))
  });

export type { AppDataStatus } from "./accountReadModel.js";
