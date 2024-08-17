CREATE INDEX IF NOT EXISTS "userIndex" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nameIndex" ON "user" USING btree ("name");