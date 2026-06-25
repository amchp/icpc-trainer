import type { initTRPC } from "@trpc/server";

import { getFindProblemsOverview } from "./findProblemsReadModel.js";
import type { ApiContext } from "./index.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

export const createFindProblemsRouter = (t: TrpcInstance) =>
  t.router({
    overview: t.procedure.query(({ ctx }) => getFindProblemsOverview(ctx.database))
  });

export type { FindProblemRow, FindProblemsOverview } from "./findProblemsReadModel.js";
