CREATE TABLE `app_user_judge_users` (
	`app_user_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`app_user_id`, `user_id`),
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `app_user_judge_users_app_role_idx` ON `app_user_judge_users` (`app_user_id`,`role`);--> statement-breakpoint
CREATE INDEX `app_user_judge_users_user_idx` ON `app_user_judge_users` (`user_id`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clerk_user_id` text NOT NULL,
	`primary_email` text,
	`display_name` text,
	`image_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_clerk_user_id_unique` ON `app_users` (`clerk_user_id`);--> statement-breakpoint
CREATE TABLE `contests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`judge_id` text NOT NULL,
	`judge` text NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`participants` integer,
	`stars` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contests_judge_id_judge_unique` ON `contests` (`judge_id`,`judge`);--> statement-breakpoint
CREATE INDEX `contests_judge_idx` ON `contests` (`judge`);--> statement-breakpoint
CREATE INDEX `contests_updated_name_idx` ON `contests` (`updated_at`,`name`);--> statement-breakpoint
CREATE INDEX `contests_name_idx` ON `contests` (`name`);--> statement-breakpoint
CREATE TABLE `health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problem_tags` (
	`problem_id` integer NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`problem_id`, `tag`),
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `problem_tags_tag_idx` ON `problem_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`judge_id` text NOT NULL,
	`judge` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`link` text NOT NULL,
	`contest_id` integer NOT NULL,
	`solves` integer NOT NULL,
	`solve_percentage` integer DEFAULT 0 NOT NULL,
	`rating` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_judge_id_judge_unique` ON `problems` (`judge_id`,`judge`);--> statement-breakpoint
CREATE INDEX `problems_contest_id_idx` ON `problems` (`contest_id`);--> statement-breakpoint
CREATE INDEX `problems_solve_percentage_idx` ON `problems` (`solve_percentage`);--> statement-breakpoint
CREATE INDEX `problems_rating_idx` ON `problems` (`rating`);--> statement-breakpoint
CREATE INDEX `problems_judge_rating_idx` ON `problems` (`judge`,`rating`);--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_user_key` text NOT NULL,
	`credential_type` text NOT NULL,
	`encrypted_payload` text NOT NULL,
	`last_validated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_credentials_provider_user_type_unique` ON `provider_credentials` (`app_user_id`,`provider`,`provider_user_key`,`credential_type`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`judge_id` text NOT NULL,
	`judge` text NOT NULL,
	`problem_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_judge_id_judge_user_unique` ON `submissions` (`judge_id`,`judge`,`user_id`);--> statement-breakpoint
CREATE INDEX `submissions_problem_user_status_idx` ON `submissions` (`problem_id`,`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `submissions_user_judge_idx` ON `submissions` (`user_id`,`judge`);--> statement-breakpoint
CREATE TABLE `user_contest_states` (
	`user_id` integer NOT NULL,
	`contest_id` integer NOT NULL,
	`submission_count` integer NOT NULL,
	`accepted_count` integer NOT NULL,
	`distinct_problem_count` integer DEFAULT 0 NOT NULL,
	`simulated` integer DEFAULT false NOT NULL,
	`last_submission_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `contest_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_contest_states_contest_simulated_idx` ON `user_contest_states` (`contest_id`,`simulated`);--> statement-breakpoint
CREATE INDEX `user_contest_states_user_simulated_idx` ON `user_contest_states` (`user_id`,`simulated`);--> statement-breakpoint
CREATE INDEX `user_contest_states_user_submission_idx` ON `user_contest_states` (`user_id`,`submission_count`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`judge` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_judge_unique` ON `users` (lower("username"),`judge`);--> statement-breakpoint
CREATE INDEX `users_judge_id_idx` ON `users` (`judge`,`id`);
