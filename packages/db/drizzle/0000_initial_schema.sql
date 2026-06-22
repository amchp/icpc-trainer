CREATE TABLE `contests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`judge_id` text NOT NULL,
	`judge` text NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`participants` integer,
	`stars` integer,
	`synced` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contests_judge_id_judge_unique` ON `contests` (`judge_id`,`judge`);--> statement-breakpoint
CREATE INDEX `contests_judge_synced_idx` ON `contests` (`judge`,`synced`);--> statement-breakpoint
CREATE INDEX `contests_name_idx` ON `contests` (`name`);--> statement-breakpoint
CREATE TABLE `health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`judge_id` text NOT NULL,
	`judge` text NOT NULL,
	`link` text NOT NULL,
	`contest_id` integer NOT NULL,
	`solves` integer NOT NULL,
	`rating` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_judge_id_judge_unique` ON `problems` (`judge_id`,`judge`);--> statement-breakpoint
CREATE TABLE `provider_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`provider_user_key` text NOT NULL,
	`credential_type` text NOT NULL,
	`encrypted_payload` text NOT NULL,
	`last_validated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_credentials_provider_user_type_unique` ON `provider_credentials` (`provider`,`provider_user_key`,`credential_type`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `submissions_judge_id_judge_unique` ON `submissions` (`judge_id`,`judge`);--> statement-breakpoint
CREATE INDEX `submissions_user_judge_idx` ON `submissions` (`user_id`,`judge`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`type` text NOT NULL,
	`judge` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);