import { relations, Table } from "drizzle-orm";

import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    avatar: jsonb("avatar"),
    username: text("username").notNull().unique(),
    name: text("name").notNull(),
    password: text("password").notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    isOnline: boolean("online"),
  },
  (table) => {
    return {
      userIndex: index("userIndex").on(table.username),
      nameIndex: index("nameIndex").on(table.name),
      isOnlineIndex: index("isOnlineIndex").on(table.isOnline),
    };
  }
);


export const message = pgTable(
  "message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    content: text("content"),
    attachment: jsonb("attachment").array(),
    sender: uuid("sender")
    .references(() => user.id)
      .notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => {
    return {
      senderIndex: index("senderIndex").on(table.sender), // New index
      chatIdIndex: index("chatIdIndex").on(table.chatId), // New index
    };
  }
);
export const chat = pgTable(
  "chat",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatname: text("chatname").notNull(),
    createdAt: timestamp("createdAt").defaultNow(),
    lastMessage: text("lastMessage"),
    // lastMessageId: uuid("last_message_id").references(() => message.id), // Add reference to last message
    lastSent: timestamp("lastSent")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      chatIndex: index("chatIndex").on(table.chatname),
      // lastMessageIndex: index("lastMessageIndex").on(table.lastMessageId),
    };
  }
);

export const chatMembers = pgTable(
  "chatMembers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    unreadCount: integer("unreadCount").notNull().default(0),
    lastReadAt: timestamp("last_read_at"),
  },

  (table) => {
    return {
      chatUserIndex: index("chatUserIndex").on(table.chatId, table.userId), // New composite index
      unreadCountIndex: index("unreadCountIndex").on(table.unreadCount), 
    };
  }
);

export enum PinType {
  CHAT = "chat",
  GROUP = "group",
}


export const pinnedChats = pgTable(
  "pinnedChats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chatId").references(() => chat.id, { onDelete: "cascade" }), // Nullable
    groupId: uuid("groupId").references(() => group.id, { onDelete: "cascade" }), // Nullable
    userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: [PinType.CHAT, PinType.GROUP] }).notNull(),
  },
  (table) => {
    return {
      pinnedChatIndex: index("pinnedChatIndex").on(table.userId, table.chatId, table.groupId),
    };
  }
);


export const mutedChats = pgTable(
  "mutedChats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid("chatId").references(() => chat.id, { onDelete: "cascade" }), // Nullable
    groupId: uuid("groupId").references(() => group.id, { onDelete: "cascade" }), // Nullable
    userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: [PinType.CHAT, PinType.GROUP] }).notNull(),
  },
  (table) => {
    return {
      mutedChatsIndex: index("mutedChatIndex").on(table.userId, table.chatId, table.groupId), // New composite index
    };
  }
);

export const userRelations = relations(user, ({ many }) => ({
  groups: many(group, {
    relationName: "groups",
  }),
  sentMessages: many(message, {
    relationName: "sentMessage",
  }),
  chats: many(chatMembers, {
    relationName: "Chats",
  }),
  pinnedChats: many(pinnedChats),
  mutedChats: many(mutedChats),
}));

export const chatRelations = relations(chat, ({ many }) => ({
  members: many(chatMembers, {
    relationName: "members",
  }),
  message: many(message, {
    relationName: "message",
  }),
}));
export const pinnedChatsRelations = relations(pinnedChats, ({ one }) => ({
  user: one(user, {
    fields: [pinnedChats.userId],
    references: [user.id],
  }),
}));
export const mutedChatsRelations = relations(mutedChats, ({ one }) => ({
  user: one(user, {
    fields: [mutedChats.userId],
    references: [user.id],
  }),
}));

export const messageRelations = relations(message, ({ one }) => ({
  sender: one(user, {
    fields: [message.sender],
    references: [user.id],
  }),
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chat, {
    fields: [chatMembers.chatId],
    references: [chat.id],
  }),
  user: one(user, {
    fields: [chatMembers.userId],
    references: [user.id],
  }),
}));

//GROUP schema
export const groupTypeEnum = pgEnum("groupType", ["public", "private"]);
export const groupRoleEnum = pgEnum("groupRole", [
  "admin",
  "member",
  "superadmin",
]);
export const group = pgTable("group", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupname: text("groupName").notNull(),
  groupType: groupTypeEnum("type").notNull(),
  groupImage: text("groupImage"),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").defaultNow(),
  lastMessage: text("lastMessage"),
  unread: boolean("unread"),
  lastSent: timestamp("lastSent")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(), // Unique identifier for the membership record
  userId: uuid("userId")
    .notNull()
    .references(() => user.id), // ID of the user
  groupId: uuid("groupId")
    .notNull()
    .references(() => group.id), // ID of the group
  role: groupRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(), // Timestamp when the user joined the group
  unreadCount: integer("unreadCount").notNull().default(0),    
},
(table) => {
  return {
    unreadCountIndex: index("groupUnreadCountIndex").on(table.unreadCount), 
  };
}

);
export const groupMessages = pgTable(
  "groupMessages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("groupId")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    content: text("content"),
    attachment: jsonb("attachment").array(),
    sender: uuid("sender")
      .references(() => user.id)
      .notNull(),
    lastSent: timestamp("lastSent")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => {
    return {
      senderIndex: index("groupSenderIndex").on(table.sender), // New index
      groupIdIndex: index("groupIdIndex").on(table.groupId), // New index
    };
  }
);
export const groupRelation = relations(group, ({ one, many }) => ({
  members: many(groupMembers, {
    relationName: "groupMembers",
  }),
  messages: many(groupMessages, {
    relationName: "groupMessages",
  }),
}));
export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(group, {
    fields: [groupMembers.groupId],
    references: [group.id],
  }),
  user: one(user, {
    fields: [groupMembers.userId],
    references: [user.id],
  }),
}));

export const groupMessageRelations = relations(groupMessages, ({ one }) => ({
  sender: one(user, {
    fields: [groupMessages.sender],
    references: [user.id],
  }),
  group: one(group, {
    fields: [groupMessages.groupId],
    references: [group.id],
  }),
}));
