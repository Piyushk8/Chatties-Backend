ALTER TABLE "chat" ADD COLUMN "lastMessage" text;--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "lastSent" timestamp DEFAULT now() NOT NULL;