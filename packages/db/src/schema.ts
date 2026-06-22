import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const enumValues = <T extends Record<string, string>>(values: T): [T[keyof T], ...T[keyof T][]] =>
  Object.values(values) as [T[keyof T], ...T[keyof T][]];

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
};

export const healthChecks = sqliteTable("health_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ...timestamps
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  type: text("type", { enum: enumValues(USER_TYPES) }).notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  ...timestamps
}, (table) => [
  uniqueIndex("users_username_unique").on(table.username)
]);

export const contests = sqliteTable("contests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  name: text("name").notNull(),
  link: text("link").notNull(),
  participants: integer("participants"),
  stars: integer("stars"),
  synced: integer("synced", { mode: "boolean" }).notNull(),
  ...timestamps
}, (table) => [
  uniqueIndex("contests_judge_id_judge_unique").on(table.judgeId, table.judge),
  index("contests_name_idx").on(table.name)
]);

export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  link: text("link").notNull(),
  contestId: integer("contest_id").references(() => contests.id).notNull(),
  solves: integer("solves").notNull(),
  rating: integer("rating").notNull(),
  ...timestamps
});

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  problemId: integer("problem_id").references(() => problems.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status", { enum: enumValues(SUBMISSION_STATUSES) }).notNull(),
  ...timestamps
});

export const providerCredentials = sqliteTable("provider_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  provider: text("provider").notNull(),
  providerUserKey: text("provider_user_key").notNull(),
  credentialType: text("credential_type").notNull(),
  encryptedPayload: text("encrypted_payload").notNull(),
  lastValidatedAt: integer("last_validated_at", { mode: "timestamp_ms" }),
  ...timestamps
}, (table) => [
  uniqueIndex("provider_credentials_provider_user_type_unique").on(
    table.provider,
    table.providerUserKey,
    table.credentialType
  )
]);

export const schema = {
  healthChecks,
  users,
  contests,
  problems,
  submissions,
  providerCredentials
};
