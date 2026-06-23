ALTER TABLE `contests` RENAME COLUMN `synced` TO `simulated`;--> statement-breakpoint
CREATE TABLE `user_contest_states` (
	`user_id` integer NOT NULL,
	`contest_id` integer NOT NULL,
	`submission_count` integer NOT NULL,
	`accepted_count` integer NOT NULL,
	`last_submission_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `contest_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contest_id`) REFERENCES `contests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_contest_states_contest_user_idx` ON `user_contest_states` (`contest_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `user_contest_states_user_submission_idx` ON `user_contest_states` (`user_id`,`submission_count`);
