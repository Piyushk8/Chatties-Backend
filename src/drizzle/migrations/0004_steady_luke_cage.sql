ALTER TABLE "user" ADD COLUMN "online" boolean;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatUserIndex" ON "chatMembers" USING btree ("chatId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "senderIndex" ON "message" USING btree ("sender");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatIdIndex" ON "message" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "isOnlineIndex" ON "user" USING btree ("online");