PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`seq` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Hand-edited: backfill seq in the best order the old rows can offer (rowid is their insertion order).
INSERT INTO `__new_todos`("id", "user_id", "title", "done", "created_at", "seq") SELECT "id", "user_id", "title", "done", "created_at", row_number() OVER (ORDER BY "created_at", rowid) FROM `todos`;--> statement-breakpoint
DROP TABLE `todos`;--> statement-breakpoint
ALTER TABLE `__new_todos` RENAME TO `todos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `todos_user_id_idx` ON `todos` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `todos_seq_uidx` ON `todos` (`seq`);
