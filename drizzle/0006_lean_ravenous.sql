CREATE TABLE `sellerFollows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sellerFollows_id` PRIMARY KEY(`id`),
	CONSTRAINT `seller_follow_unique` UNIQUE(`followerId`,`sellerId`)
);
--> statement-breakpoint
ALTER TABLE `sellerFollows` ADD CONSTRAINT `sellerFollows_followerId_users_id_fk` FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sellerFollows` ADD CONSTRAINT `sellerFollows_sellerId_users_id_fk` FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `seller_follow_seller_idx` ON `sellerFollows` (`sellerId`);