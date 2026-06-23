CREATE TABLE `problem_tags` (
	`problem_id` integer NOT NULL,
	`tag` text NOT NULL,
	PRIMARY KEY(`problem_id`, `tag`),
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `problem_tags_tag_idx` ON `problem_tags` (`tag`);
