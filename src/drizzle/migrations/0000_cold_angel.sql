DO $$ BEGIN
 CREATE TYPE "public"."groupRole" AS ENUM('admin', 'member', 'superadmin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."groupType" AS ENUM('public', 'private');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatname" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastMessage" text,
	"lastSent" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatMembers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"unreadCount" integer DEFAULT 0 NOT NULL,
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"groupName" text NOT NULL,
	"type" "groupType" NOT NULL,
	"groupImage" text,
	"creator_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"lastMessage" text,
	"unread" boolean,
	"lastSent" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"groupId" uuid NOT NULL,
	"role" "groupRole" NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"unreadCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "groupMessages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"groupId" uuid NOT NULL,
	"content" text,
	"attachment" jsonb[],
	"sender" uuid NOT NULL,
	"lastSent" timestamp DEFAULT now(),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"content" text,
	"attachment" jsonb[],
	"sender" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mutedChats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid,
	"groupId" uuid,
	"userId" uuid NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pinnedChats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid,
	"groupId" uuid,
	"userId" uuid NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avatar" jsonb,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"online" boolean,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group" ADD CONSTRAINT "group_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "groupMessages" ADD CONSTRAINT "groupMessages_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "groupMessages" ADD CONSTRAINT "groupMessages_sender_user_id_fk" FOREIGN KEY ("sender") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_sender_user_id_fk" FOREIGN KEY ("sender") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mutedChats" ADD CONSTRAINT "mutedChats_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mutedChats" ADD CONSTRAINT "mutedChats_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mutedChats" ADD CONSTRAINT "mutedChats_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pinnedChats" ADD CONSTRAINT "pinnedChats_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pinnedChats" ADD CONSTRAINT "pinnedChats_groupId_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pinnedChats" ADD CONSTRAINT "pinnedChats_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatIndex" ON "chat" USING btree ("chatname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatUserIndex" ON "chatMembers" USING btree ("chatId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unreadCountIndex" ON "chatMembers" USING btree ("unreadCount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groupUnreadCountIndex" ON "group_members" USING btree ("unreadCount");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groupSenderIndex" ON "groupMessages" USING btree ("sender");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "groupIdIndex" ON "groupMessages" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "senderIndex" ON "message" USING btree ("sender");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatIdIndex" ON "message" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mutedChatIndex" ON "mutedChats" USING btree ("userId","chatId","groupId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pinnedChatIndex" ON "pinnedChats" USING btree ("userId","chatId","groupId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "userIndex" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nameIndex" ON "user" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "isOnlineIndex" ON "user" USING btree ("online");