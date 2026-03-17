CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`oldValues` text,
	`newValues` text,
	`ipAddress` varchar(64),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`type` enum('submission_alert','review_result','correction_request','approval') NOT NULL,
	`relatedTimesheetId` int,
	`sentAt` timestamp,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeCode` varchar(32) NOT NULL,
	`firstName` varchar(64) NOT NULL,
	`lastName` varchar(64) NOT NULL,
	`jobTitle` varchar(128),
	`phone` varchar(32),
	`email` varchar(320),
	`teamId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_employeeCode_unique` UNIQUE(`employeeCode`)
);
--> statement-breakpoint
CREATE TABLE `team_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`teamId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`unassignedAt` timestamp,
	`assignedBy` int,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `team_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`projectSite` varchar(256),
	`managerId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheet_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timesheetId` int NOT NULL,
	`employeeId` int NOT NULL,
	`hoursWorked` decimal(4,2) NOT NULL,
	`overtimeHours` decimal(4,2) DEFAULT '0',
	`workType` enum('regular','overtime','holiday','sick','absent') NOT NULL DEFAULT 'regular',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheet_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`teamId` int NOT NULL,
	`workDate` date NOT NULL,
	`status` enum('draft','submitted','approved','flagged') NOT NULL DEFAULT 'draft',
	`notes` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','hr_admin','manager') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_notifications` ADD CONSTRAINT `email_notifications_relatedTimesheetId_timesheets_id_fk` FOREIGN KEY (`relatedTimesheetId`) REFERENCES `timesheets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_assignments` ADD CONSTRAINT `team_assignments_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_assignments` ADD CONSTRAINT `team_assignments_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_assignments` ADD CONSTRAINT `team_assignments_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheet_entries` ADD CONSTRAINT `timesheet_entries_timesheetId_timesheets_id_fk` FOREIGN KEY (`timesheetId`) REFERENCES `timesheets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheet_entries` ADD CONSTRAINT `timesheet_entries_employeeId_employees_id_fk` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_teamId_teams_id_fk` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_al_user` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_al_entity` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_al_created` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_en_recipient` ON `email_notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `idx_en_status` ON `email_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ta_employee` ON `team_assignments` (`employeeId`);--> statement-breakpoint
CREATE INDEX `idx_ta_team` ON `team_assignments` (`teamId`);--> statement-breakpoint
CREATE INDEX `idx_te_timesheet` ON `timesheet_entries` (`timesheetId`);--> statement-breakpoint
CREATE INDEX `idx_te_employee` ON `timesheet_entries` (`employeeId`);--> statement-breakpoint
CREATE INDEX `idx_ts_manager` ON `timesheets` (`managerId`);--> statement-breakpoint
CREATE INDEX `idx_ts_team` ON `timesheets` (`teamId`);--> statement-breakpoint
CREATE INDEX `idx_ts_date` ON `timesheets` (`workDate`);--> statement-breakpoint
CREATE INDEX `idx_ts_status` ON `timesheets` (`status`);