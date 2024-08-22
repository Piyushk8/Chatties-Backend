ALTER TABLE "chatMembers" DROP CONSTRAINT "chatMembers_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "chatMembers" DROP CONSTRAINT "chatMembers_userId_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatMembers" ADD CONSTRAINT "chatMembers_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatMembers" ADD CONSTRAINT "chatMembers_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
