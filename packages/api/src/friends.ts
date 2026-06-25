import { JUDGES, USER_TYPES } from "@icpc-trainer/shared";
import type { initTRPC } from "@trpc/server";
import { z } from "zod";

import type { ApiContext } from "./index.js";
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
    roster: t.procedure.query(({ ctx }) => getUserRoster(ctx.database, USER_TYPES.Friend)),
    add: t.procedure.input(addFriendInputSchema).mutation(({ ctx, input }) =>
      addUserToRoster(ctx.database, USER_TYPES.Friend, input, "friend")
    ),
    replace: t.procedure.input(replaceFriendsInputSchema).mutation(({ ctx, input }) =>
      replaceUserRoster(ctx.database, USER_TYPES.Friend, input.users, "friend")
    )
  });
