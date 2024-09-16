import { relations } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
export const user = pgTable('user', {
    id: uuid("id").defaultRandom().primaryKey(),
    avatar: jsonb('avatar'),
    username: text('username').notNull().unique(),
    name: text('name').notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
    isOnline: boolean("online"),
}, table => {
    return {
        userIndex: index("userIndex").on(table.username),
        nameIndex: index("nameIndex").on(table.name),
        isOnlineIndex: index("isOnlineIndex").on(table.isOnline),
    };
});
export const chat = pgTable('chat', {
    id: uuid('id').defaultRandom().primaryKey(),
    chatname: text('chatname').notNull(),
    groupChat: boolean("groupChat").default(false),
    createdAt: timestamp('createdAt').defaultNow(),
    lastMessage: text('lastMessage'),
    unread: boolean("unread"),
    lastSent: timestamp("lastSent").notNull().defaultNow().$onUpdate(() => new Date()),
}, table => {
    return {
        chatIndex: index("chatIndex").on(table.chatname)
    };
});
export const message = pgTable('message', {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid('chatId').notNull().references(() => chat.id, { onDelete: "cascade" }),
    content: text('content'),
    attachment: jsonb('attachment').array(),
    sender: uuid('sender')
        .references(() => user.id)
        .notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow()
}, (table) => {
    return {
        senderIndex: index("senderIndex").on(table.sender), // New index
        chatIdIndex: index("chatIdIndex").on(table.chatId), // New index
    };
});
export const chatMembers = pgTable('chatMembers', {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid('chatId').notNull().references(() => chat.id, { onDelete: "cascade" }),
    userId: uuid('userId').notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => {
    return {
        chatUserIndex: index("chatUserIndex").on(table.chatId, table.userId) // New composite index
    };
});
export const pinnedChats = pgTable('pinnedChats', {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid('chatId').notNull().references(() => chat.id, { onDelete: "cascade" }),
    userId: uuid('userId').notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => {
    return {
        pinnedChatIndex: index("pinnedChatIndex").on(table.chatId, table.userId) // New composite index
    };
});
export const userRelations = relations(user, ({ many }) => ({
    sentMessages: many(message, {
        relationName: "sentMessage"
    }),
    chats: many(chatMembers, {
        relationName: "Chats"
    }),
}));
// export const lastMessageAndChatRelation = relations(cha,({one})=>({
//   sender: one(user, {
//     fields: [message.sender],
//     references: [user.id],
//   }),
//   chat:one(chat,{
//     fields: [message.chatId],
//     references: [chat.id],
//   })
// }))
export const chatRelations = relations(chat, ({ many }) => ({
    members: many(chatMembers, {
        relationName: 'members'
    }),
    message: many(message, {
        relationName: 'message'
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
    })
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
