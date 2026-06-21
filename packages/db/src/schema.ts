import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const healthChecks = sqliteTable("health_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull()
});

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    type: text("type", { enum: ["primary", "user", "friend", "team"] }).notNull(),
    judge: text("judge", { enum: ["codeforces", "qoj"] }).notNull(),
});

export const contests = sqliteTable("contests", {
    
});

export const problems = sqliteTable("problems", {
});

export const schema = {
  healthChecks
};
