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

const replaceFriendsInputSchema = z.object({
  users: z
    .array(z.object({
      username: usernameSchema,
      judge: judgeSchema
    }))
    .max(100)
});

const addFriendInputSchema = z.object({
  username: usernameSchema,
  judge: judgeSchema
});

export type FriendUser = RosterUser<USER_TYPES.Friend>;
export type FriendsRoster = UserRoster<USER_TYPES.Friend>;

export const createFriendsRouter = (t: TrpcInstance) =>
  t.router({
    roster: t.procedure.query(({ ctx }) => getUserRoster(ctx.database, requireAppUser(ctx.appUser).id, USER_TYPES.Friend)),
    add: t.procedure.input(addFriendInputSchema).mutation(({ ctx, input }) => {
      const appUser = requireAppUser(ctx.appUser);
      return addUserToRoster(ctx.database, appUser.id, USER_TYPES.Friend, input, "friend").then((result) => {
        ctx.analytics?.capture({
          distinctId: appUser.clerkUserId,
          event: "friend_added",
          properties: { judge: input.judge }
        });
        return result;
      });
    }),
    replace: t.procedure.input(replaceFriendsInputSchema).mutation(({ ctx, input }) => {
      const appUser = requireAppUser(ctx.appUser);
      return replaceUserRoster(ctx.database, appUser.id, USER_TYPES.Friend, input.users, "friend").then((result) => {
        ctx.analytics?.capture({
          distinctId: appUser.clerkUserId,
          event: "friends_roster_replaced",
          properties: { friend_count: input.users.length }
        });
        return result;
      });
    })
  });
