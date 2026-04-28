CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`gender` text NOT NULL,
	`gender_probability` real NOT NULL,
	`age` integer NOT NULL,
	`age_group` text NOT NULL,
	`country_id` text NOT NULL,
	`country_name` text NOT NULL,
	`country_probability` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_name_unique` ON `profiles` (`name`);--> statement-breakpoint
CREATE INDEX `profiles_gender_idx` ON `profiles` (`gender`);--> statement-breakpoint
CREATE INDEX `profiles_age_idx` ON `profiles` (`age`);--> statement-breakpoint
CREATE INDEX `profiles_age_group_idx` ON `profiles` (`age_group`);--> statement-breakpoint
CREATE INDEX `profiles_country_id_idx` ON `profiles` (`country_id`);--> statement-breakpoint
CREATE INDEX `profiles_created_at_idx` ON `profiles` (`created_at`);--> statement-breakpoint
CREATE INDEX `profiles_gender_prob_idx` ON `profiles` (`gender_probability`);--> statement-breakpoint
CREATE INDEX `profiles_country_prob_idx` ON `profiles` (`country_probability`);