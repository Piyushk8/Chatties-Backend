ALTER TABLE "chatMembers" ADD COLUMN "unreadCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chatMembers" ADD COLUMN "last_read_at" timestamp;--> statement-breakpoint
ALTER TABLE "group_members" ADD COLUMN "unreadCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreadCountIndex" ON "chatMembers" USING btree ("unreadCount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groupUnreadCountIndex" ON "group_members" USING btree ("unreadCount");--> statement-breakpoint
ALTER TABLE "chat" DROP COLUMN IF EXISTS "groupChat";