import { JUDGES, SUBMISSION_STATUSES, USER_TYPES } from "@icpc-trainer/shared";
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull(),
  primaryEmail: text("primary_email"),
  displayName: text("display_name"),
  imageUrl: text("image_url"),
  ...timestamps
}, (table) => [
  uniqueIndex("app_users_clerk_user_id_unique").on(table.clerkUserId)
]);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  ...timestamps
}, (table) => [
  uniqueIndex("users_username_judge_unique").on(sql`lower(${table.username})`, table.judge),
  index("users_judge_id_idx").on(table.judge, table.id)
]);

export const appUserJudgeUsers = sqliteTable("app_user_judge_users", {
  appUserId: integer("app_user_id").references(() => appUsers.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role", { enum: enumValues(USER_TYPES) }).notNull(),
  ...timestamps
}, (table) => [
  primaryKey({ columns: [table.appUserId, table.userId] }),
  index("app_user_judge_users_app_role_idx").on(table.appUserId, table.role),
  index("app_user_judge_users_user_idx").on(table.userId)
]);

export const contests = sqliteTable("contests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  name: text("name").notNull(),
  link: text("link").notNull(),
  participants: integer("participants"),
  stars: integer("stars"),
  ...timestamps
}, (table) => [
  uniqueIndex("contests_judge_id_judge_unique").on(table.judgeId, table.judge),
  index("contests_judge_idx").on(table.judge),
  index("contests_updated_name_idx").on(table.updatedAt, table.name),
  index("contests_name_idx").on(table.name)
]);

export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  name: text("name").notNull().default(""),
  link: text("link").notNull(),
  contestId: integer("contest_id").references(() => contests.id).notNull(),
  solves: integer("solves").notNull(),
  solvePercentage: integer("solve_percentage").notNull().default(0),
  rating: integer("rating").notNull(),
  ...timestamps
}, (table) => [
  uniqueIndex("problems_judge_id_judge_unique").on(table.judgeId, table.judge),
  index("problems_contest_id_idx").on(table.contestId),
  index("problems_solve_percentage_idx").on(table.solvePercentage),
  index("problems_rating_idx").on(table.rating),
  index("problems_judge_rating_idx").on(table.judge, table.rating)
]);

export const problemTags = sqliteTable("problem_tags", {
  problemId: integer("problem_id").references(() => problems.id).notNull(),
  tag: text("tag").notNull()
}, (table) => [
  primaryKey({ columns: [table.problemId, table.tag] }),
  index("problem_tags_tag_idx").on(table.tag)
]);

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  judgeId: text("judge_id").notNull(),
  judge: text("judge", { enum: enumValues(JUDGES) }).notNull(),
  problemId: integer("problem_id").references(() => problems.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status", { enum: enumValues(SUBMISSION_STATUSES) }).notNull(),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
  ...timestamps
}, (table) => [
  uniqueIndex("submissions_judge_id_judge_user_unique").on(table.judgeId, table.judge, table.userId),
  index("submissions_problem_user_status_idx").on(table.problemId, table.userId, table.status),
  index("submissions_user_judge_idx").on(table.userId, table.judge)
]);

export const userContestStates = sqliteTable("user_contest_states", {
  userId: integer("user_id").references(() => users.id).notNull(),
  contestId: integer("contest_id").references(() => contests.id).notNull(),
  submissionCount: integer("submission_count").notNull(),
  acceptedCount: integer("accepted_count").notNull(),
  distinctProblemCount: integer("distinct_problem_count").notNull().default(0),
  simulated: integer("simulated", { mode: "boolean" }).notNull().default(false),
  lastSubmissionAt: integer("last_submission_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
}, (table) => [
  primaryKey({ columns: [table.userId, table.contestId] }),
  index("user_contest_states_contest_simulated_idx").on(table.contestId, table.simulated),
  index("user_contest_states_user_simulated_idx").on(table.userId, table.simulated),
  index("user_contest_states_user_submission_idx").on(table.userId, table.submissionCount)
]);

export const providerCredentials = sqliteTable("provider_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appUserId: integer("app_user_id").references(() => appUsers.id).notNull(),
  provider: text("provider").notNull(),
  providerUserKey: text("provider_user_key").notNull(),
  credentialType: text("credential_type").notNull(),
  encryptedPayload: text("encrypted_payload").notNull(),
  lastValidatedAt: integer("last_validated_at", { mode: "timestamp_ms" }),
  ...timestamps
}, (table) => [
  uniqueIndex("provider_credentials_provider_user_type_unique").on(
    table.appUserId,
    table.provider,
    table.providerUserKey,
    table.credentialType
  )
]);

export const schema = {
  healthChecks,
  appUsers,
  users,
  appUserJudgeUsers,
  contests,
  problems,
  problemTags,
  submissions,
  userContestStates,
  providerCredentials
};
