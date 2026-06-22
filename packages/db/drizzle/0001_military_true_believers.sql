CREATE INDEX `problems_rating_idx` ON `problems` (`rating`);--> statement-breakpoint
CREATE INDEX `problems_judge_rating_idx` ON `problems` (`judge`,`rating`);