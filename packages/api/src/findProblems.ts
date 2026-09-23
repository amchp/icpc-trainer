import type { initTRPC } from "@trpc/server";
import { listInputSchema } from "./listInput.js";

import { getFindProblemsOverview } from "./findProblemsReadModel.js";
import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createFindProblemsRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.input(listInputSchema).query(({ ctx, input }) =>
      getFindProblemsOverview(ctx.database, requireAppUser(ctx.appUser).id, input?.limit))
  });

export type { FindProblemRow, FindProblemsOverview } from "./findProblemsReadModel.js";
