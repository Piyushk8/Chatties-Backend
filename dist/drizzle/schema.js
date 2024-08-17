import { relations } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
export const user = pgTable('user', {
    id: uuid("id").defaultRandom().primaryKey(),
    avatar: jsonb('avatar'),
    username: text('username').notNull().unique(),
    name: text('name').notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('createdAt').defaultNow(),
}, table => {
    return {
        userIndex: index("userIndex").on(table.username),
        nameIndex: index("nameIndex").on(table.name)
    };
});
export const chat = pgTable('chat', {
    id: uuid('id').defaultRandom().primaryKey(),
    chatname: text('chatname').notNull(),
    groupChat: boolean("groupChat").default(false),
    createdAt: timestamp('createdAt').defaultNow(),
}, table => {
    return {
        chatIndex: index("chatIndex").on(table.chatname)
    };
});
export const message = pgTable('message', {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid('chatId').notNull().references(() => chat.id),
    content: text('content'),
    attachment: jsonb('attachment').array(),
    sender: uuid('sender')
        .references(() => user.id)
        .notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow()
});
export const chatMembers = pgTable('chatMembers', {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: uuid('chatId').notNull().references(() => chat.id),
    userId: uuid('userId').notNull().references(() => user.id),
});
export const userRelations = relations(user, ({ many }) => ({
    sentMessages: many(message, {
        relationName: "sentMessage"
    }),
    chats: many(chatMembers, {
        relationName: "Chats"
    }),
}));
export const chatRelations = relations(chat, ({ many }) => ({
    members: many(chatMembers, {
        relationName: 'members'
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
