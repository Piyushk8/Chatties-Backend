DROP INDEX IF EXISTS "pinnedChatIndex";--> statement-breakpoint
ALTER TABLE "pinnedChats" ALTER COLUMN "chatId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pinnedChats" ADD COLUMN "groupId" uuid;--> statement-breakpoint
ALTER TABLE "pinnedChats" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pinnedChats" ADD CONSTRAINT "pinnedChats_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pinnedChatIndex" ON "pinnedChats" USING btree ("userId","chatId","groupId");