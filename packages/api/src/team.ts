import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";
import { requireAppUser } from "./appUsers.js";
import {
  addUserToRoster,
  getUserRoster,
  replaceUserRoster,
  type RosterUser,
  type UserRoster
} from "./userRoster.js";

type TrpcInstance = ReturnType<typeof initTRPC.context<ApiContext>>["create"] extends () => infer T
  ? T
  : never;

const usernameSchema = z.string().trim().min(1).max(64);
const judgeSchema = z.nativeEnum(JUDGES);

const replaceTeamInputSchema = z.object({
  users: z
    .array(z.object({
      username: usernameSchema,
      judge: judgeSchema
    }))
    .max(20)
});

const addTeamUserInputSchema = z.object({
  username: usernameSchema,
  judge: judgeSchema
});

export type TeamUser = RosterUser<USER_TYPES.Team>;
export type TeamRoster = UserRoster<USER_TYPES.Team>;

export const createTeamRouter = (t: TrpcInstance) =>
  t.router({
    roster: t.procedure.query(({ ctx }) => getUserRoster(ctx.database, requireAppUser(ctx.appUser).id, USER_TYPES.Team)),
    add: t.procedure.input(addTeamUserInputSchema).mutation(({ ctx, input }) => {
      const appUser = requireAppUser(ctx.appUser);
      return addUserToRoster(ctx.database, appUser.id, USER_TYPES.Team, input, "team user").then((result) => {
        ctx.analytics?.capture({
          distinctId: appUser.clerkUserId,
          event: "team_member_added",
          properties: { judge: input.judge }
        });
        return result;
      });
    }),
    replace: t.procedure.input(replaceTeamInputSchema).mutation(({ ctx, input }) => {
      const appUser = requireAppUser(ctx.appUser);
      return replaceUserRoster(ctx.database, appUser.id, USER_TYPES.Team, input.users, "team user").then((result) => {
        ctx.analytics?.capture({
          distinctId: appUser.clerkUserId,
          event: "team_roster_replaced",
          properties: { member_count: input.users.length }
        });
        return result;
      });
    })
  });
