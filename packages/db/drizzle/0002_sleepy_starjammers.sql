ALTER TABLE `problems` ADD `solve_percentage` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `problems_solve_percentage_idx` ON `problems` (`solve_percentage`);