DROP INDEX `submissions_judge_id_judge_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_judge_id_judge_user_unique` ON `submissions` (`judge_id`,`judge`,`user_id`);