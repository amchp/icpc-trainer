DROP INDEX `users_username_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_judge_unique` ON `users` (`username`,`judge`);
