CREATE TABLE `learning_progress` (
	`app_user_id` integer NOT NULL,
	`guide_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`app_user_id`, `guide_id`),
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `learning_progress_app_status_idx` ON `learning_progress` (`app_user_id`,`status`);