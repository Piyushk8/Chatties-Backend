DROP INDEX IF EXISTS "mutedChatIndex";--> statement-breakpoint
ALTER TABLE "mutedChats" ALTER COLUMN "chatId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mutedChats" ADD COLUMN "groupId" uuid;--> statement-breakpoint
ALTER TABLE "mutedChats" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mutedChats" ADD CONSTRAINT "mutedChats_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mutedChatIndex" ON "mutedChats" USING btree ("userId","chatId","groupId");