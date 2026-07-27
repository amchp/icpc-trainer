CREATE TABLE `class_members` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`added_by_app_user_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by_app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `submissions_status_user_problem_submitted_idx` ON `submissions` (`status`,`user_id`,`problem_id`,`submitted_at`);