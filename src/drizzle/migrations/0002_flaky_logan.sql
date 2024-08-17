ALTER TABLE "chat" ADD COLUMN "groupChat" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatIndex" ON "chat" USING btree ("chatname");