import { Server, Socket } from "socket.io";
import { CustomSocket } from "../types/types.js";
import { socketAuth } from "../middlewares/auth.js";
import { RedisService } from "../Redis/redisManager.js";
import { db } from "../drizzle/migrate.js";
import {
  user as userSchema,
  chat,
  chatMembers,
  message as MessageSchema,
  groupMessages,
  group,
  groupMembers,
  user,
  pinnedChats,
  mutedChats,
  PinType,
} from "../drizzle/schema.js";
import { and, eq, ne, or, sql } from "drizzle-orm";
import {
  InitialUsersStatus,
  IS_TYPING,
  MARK_GROUP_MESSAGES_READ,
  MARK_MESSAGES_READ,
  NEW_GROUP_MESSAGE,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  STOP_TYPING,
} from "../constants/events.js";
import { json } from "drizzle-orm/mysql-core";

export class SocketService {
  private io: Server;
  public redisService: RedisService;

  constructor(server: any, redisService: RedisService) {
    this.redisService = redisService;
    this.io = new Server(server, {
      cors: {
        origin: [
          "http://localhost:5173",
          "http://localhost:4173",
          process.env.CLIENT_URL || "",
        ].filter(Boolean),
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
      },
    });

    // Apply authentication middleware
    this.io.use(socketAuth);

    // Initialize socket events
    this.initialize();
  }

  private async handleUserConnection(socket: CustomSocket) {
    const user = socket.user;
    if (!user?.id) return;

    try {
      // Store user's socket mapping in Redis
      await this.redisService
        .getClient()
        .hset("user:sockets", user.id, socket.id);

      // Update user's online status in database
      await db
        .update(userSchema)
        .set({ isOnline: true })
        .where(eq(userSchema.id, user.id));

      // Get online users and broadcast to self
      const onlineUsersIds = await this.getFriendsOnline(user?.id);
      if (!onlineUsersIds || onlineUsersIds.length === 0) return;
      socket.emit(InitialUsersStatus, { onlineUsersIds });

      //broadcast to others
      const friendsSocketId = await this.getSocketIds(onlineUsersIds);
      if (friendsSocketId?.length === 0 || !friendsSocketId) return;
      await this.redisService
        .getClient()
        .sadd(`user:${user?.id}:onlineFriends`, onlineUsersIds);
      await this.redisService.getPublisher().publish(
        "user:status",
        JSON.stringify({
          onlineUsers: friendsSocketId,
          userId: socket.user?.id,
          status: "online",
        })
      );
    } catch (error) {
      console.error("Error handling user connection:", error);
    }
  }

  // fetches all online friends of user
  private async getFriendsOnline(id: string) {
    const redisClient = await this.redisService.getClient();
    const cachedFriendIds = await redisClient.smembers(
      `user:${id}:onlineFriends`
    );
    if (cachedFriendIds.length === 0) {
      //db call
      const friends = await db
        .select({
          id: userSchema.id,
        })
        .from(userSchema)
        .innerJoin(chatMembers, eq(chatMembers.userId, userSchema.id))
        .where(
          and(
            eq(userSchema.isOnline, true),
            ne(chatMembers.userId, id),
            sql`${chatMembers.chatId} IN (
            SELECT ${chatMembers.chatId}
            FROM ${chatMembers}
            WHERE ${chatMembers.userId} = ${id}
          )`
          )
        )
        .groupBy(userSchema.id);
      const friendsId = friends.flatMap((friend: any) => friend?.id);
      return friendsId;
    }
    const userSocketEntries = await this.redisService
      .getClient()
      .hkeys("user:sockets");

    // Get userIds for active sockets
    const onlineUserIds = cachedFriendIds.filter((socket) =>
      userSocketEntries.includes(socket)
    );
    return onlineUserIds;
  }

  //fetches online friends socketIds
  private async getSocketIds(friendsIds: string[]) {
    if (friendsIds.length == 0) return undefined;

    const Sockets = await this.redisService
      .getClient()
      .hmget("user:sockets", ...friendsIds);
    const socketIds = Sockets.filter((s) => s !== null);
    return socketIds;
  }

  //updates socket id for user's groups - adds user's socketId to its group set + set of user's groupIds
  private async updateGroupMemberSocket(
    userId: string,
    socketId: string,
    groupIds: string[] | undefined
  ) {
    if (!groupIds?.length) return;
    const redisClient = this.redisService.getClient();
    const pipeline = redisClient.pipeline();

    try {
      // First store the current socket's group mappings for cleanup
      // pipeline.sadd(`socket:${socketId}:groups`, ...groupIds);
      pipeline.sadd(`socket:${userId}:groups`, ...groupIds);
      pipeline.expire(`socket:${socketId}:groups`, 24 * 60 * 60);

      // Then add to all groups
      for (const groupId of groupIds) {
        pipeline.sadd(`group:${groupId}:members`, userId);
        pipeline.expire(`group:${groupId}:members`, 24 * 60 * 60);
      }
      await pipeline.exec();
    } catch (error) {
      console.error("Error updating group member socket:", error);
    }
  }

  //remove user's socketId from its group set
  private async removeGroupMemberSocket(
    socketId: string,
    userId: string,
    groupIds: string[] | undefined
  ) {
    if (!groupIds?.length) return;
    const redisClient = this.redisService.getClient();
    const pipeline = redisClient.pipeline();

    try {
      // Get additional groups this socket might be part of
      const socketGroups = await redisClient.smembers(
        `socket:${userId}:groups`
      );
      const allGroupIds = [...new Set([...groupIds, ...socketGroups])];

      // Remove socket from all groups
      for (const groupId of allGroupIds) {
        pipeline.srem(`group:${groupId}:members`, userId);
      }

      // Clean up socket's group mapping
      pipeline.del(`socket:${userId}:groups`);
      await pipeline.exec();
    } catch (error) {
      console.error("Error removing socket from groups:", error);
    }
  }

  // group socket cleanup method
  private async cleanupStaleGroupSockets() {
    const redisClient = this.redisService.getClient();
    const pipeline = redisClient.pipeline();

    try {
      // Get all group keys
      const keys = await redisClient.keys("group:*:members");

      for (const key of keys) {
        const groupId = key.split(":")[1];
        const members = await redisClient.smembers(key);

        // Check each member's existence in user:sockets
        for (const socketId of members) {
          const userSocket = await redisClient.hgetall("user:sockets");
          if (!Object.values(userSocket).includes(socketId)) {
            pipeline.srem(`group:${groupId}:members`, socketId);
            pipeline.del(`socket:${socketId}:groups`);
          }
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error("Error cleaning up stale group sockets:", error);
    }
  }
  private async handleGroupMessage(socket: CustomSocket, data: any) {
    const user = socket.user;
    const { groupId, message } = data;
    if (!user) return;

    try {
      const messageData = {
        content: message,
        sender: user,
        groupId: groupId,
        createdAt: new Date().toISOString(),
      };

      // Send feedback to sender
      socket.emit(NEW_GROUP_MESSAGE, messageData);
      const unreadCountData = await db
        .update(groupMembers)
        .set({
          unreadCount: sql`${groupMembers?.unreadCount} + 1`,
        })
        .where(
          and(
            eq(groupMembers?.groupId, groupId),
            ne(groupMembers?.userId, user?.id)
          )
        )
        .returning({ unreadCount: groupMembers?.unreadCount });

      // Store in database first
      const result = await db.insert(groupMessages).values({
        content: message,
        sender: user?.id,
        groupId: groupId,
      });

      // Update group metadata
      if (result) {
        await db
          .update(group)
          .set({
            lastMessage: message,
            lastSent: new Date(),
          })
          .where(eq(group.id, groupId));
      }

      // Publish to Redis only the necessary data
      await this.redisService.getPublisher().publish(
        "group:messages",
        JSON.stringify({
          groupId,
          unreadCountData,
          socketId: socket.id,
          message: messageData,
        })
      );
    } catch (error) {
      socket.emit("MESSAGE_ERROR", error);
      console.error("Error handling group message:", error);
    }
  }

  //handles chat messages
  private async handleNewMessage(
    socket: CustomSocket,
    data: any,
    fromAPI = false
  ) {
    const user = fromAPI ? data.sender : socket.user; // If from API, use provided sender
    const { chatId, members, message, attachment } = data;
    if (!chatId || !user) return;
    try {
      // Prepare message data
      const messageData = {
        content: message || "", // Empty if only media
        attachment: attachment || null, // Attachments or empty for text
        sender: user,
        chatId,
        createdAt: new Date().toISOString(),
      };

      // Emit only if it didn’t come from API (to prevent duplication)
      if (!fromAPI) {
        socket.emit(NEW_MESSAGE, messageData);
      }

      // Update unread count
      const unreadCountData = await db
        .update(chatMembers)
        .set({ unreadCount: sql`${chatMembers?.unreadCount} + 1` })
        .where(
          and(
            eq(chatMembers?.chatId, chatId),
            eq(chatMembers?.userId, user?.id)
          )
        )
        .returning({ unreadCount: chatMembers?.unreadCount });

      // Publish to Redis for real-time delivery
      await this.redisService
        .getPublisher()
        .publish(
          "chat:messages",
          JSON.stringify({
            chatId,
            socketId:socket?.id,
            unreadCountData,
            message: messageData,
            members,
          })
        );

      // Store in database
      const result = await db.insert(MessageSchema).values({
        content: message || "",
        attachment: attachment || null,
        sender: user?.id,
        chatId,
      });

      // Update chat's last message
      if (result) {
        await db
          .update(chat)
          .set({ lastMessage: message || "📎 Attachment" })
          .where(eq(chat.id, chatId));
      }
    } catch (error) {
      socket.emit("MESSAGE_ERROR", error);
      console.error("Error handling new message:", error);
    }
  }

  public async handleNewMessageFromAPI(data: any) {
    await this.handleNewMessage(null as any, data, true);
  }

  private async handleMarkMessagesRead(
    socket: CustomSocket,
    data: any,
    isGroup: boolean
  ) {
    const user = socket.user;
    const { chatId, userId, groupId } = data;
    if (!user?.id) return;

    try {
      // Reset unread count in database
      if (!isGroup) {
        const res = await db
          .update(chatMembers)
          .set({ unreadCount: 0 })
          .where(
            and(eq(chatMembers?.chatId, chatId), ne(chatMembers.userId, userId))
          );
        return;
      }

      await db
        .update(groupMembers)
        .set({
          unreadCount: 0,
        })
        .where(
          and(
            ne(groupMembers?.userId, userId),
            eq(groupMembers?.groupId, groupId)
          )
        );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  // private async handleGroupTyping(socket: CustomSocket, data: any) {
  //   const { groupId, members } = data;
  //   const user = socket.user;

  //   try {
  //     const onlineMemberSockets = await this.getGroupMemberSockets(members);

  //     if (onlineMemberSockets && onlineMemberSockets.length > 0) {
  //       socket.to(onlineMemberSockets).emit(IS_TYPING, {
  //         groupId,
  //         userId: user?.id,
  //         userName: user?.name
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error handling group typing:", error);
  //   }
  // }

  // private async handleGroupStopTyping(socket: CustomSocket, data: any) {
  //   const { groupId, members } = data;
  //   const user = socket.user;

  //   try {
  //     const onlineMemberSockets = await this.getGroupMemberSockets(members);

  //     if (onlineMemberSockets && onlineMemberSockets.length > 0) {
  //       socket.to(onlineMemberSockets).emit(STOP_TYPING, {
  //         groupId,
  //         userId: user?.id
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error handling group stop typing:", error);
  //   }
  // }
  private initialize() {
    // Subscribe to Redis channels
    const subscriber = this.redisService.getSubscriber();
    subscriber.subscribe(
      "chat:messages",
      "user:status",
      "typing:status",
      "group:messages"
    );

    // Handle Redis messages
    subscriber.on("message", async (channel, message) => {
      const data = JSON.parse(message);

      switch (channel) {
        case "chat:messages":
          try {
            const sockets = await Promise.all(
              data?.members.map(async (member: string) => {
                return await this.redisService
                  ?.getClient()
                  .hget("user:sockets", member);
              })
            );
            this.io.to(sockets).emit(NEW_MESSAGE, {
              chatId: data.chatId,
              message: data.message,
            });
            this.io.to(sockets).emit(NEW_MESSAGE_ALERT, {
              chatId: data.chatId,
              userId: data.senderId,
              unreadCount: data?.unreadCountData[0]?.unreadCount, // Increment by 1
            });
          } catch (error) {
            console.log("error subscribing message");
          }
          break;
        case "group:messages":
          try {
            // console.log("hearing alright");
            const { groupId, socketId, message: messageData } = data;
            const activeSocketIds = await this.redisService
              .getClient()
              .smembers(`group:${groupId}:members`);

            if (activeSocketIds.length > 0) {
              // Get sender's socket ID to exclude it

              if (socketId) {
                const recipientSocketIds = activeSocketIds.filter(
                  (id) => id !== socketId
                );

                if (recipientSocketIds.length > 0) {
                  // Emit only to other members, not to sender
                  this.io.to(recipientSocketIds).emit(NEW_GROUP_MESSAGE, {
                    groupId,
                    message: messageData,
                  });
                  this.io.to(recipientSocketIds).emit(NEW_MESSAGE_ALERT, {
                    groupIdId: data.groupId,
                    userId: data.senderId,
                    unreadCount: 1, // Increment by 1
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error broadcasting group message:", error);
            // No error recovery mechanism
          }

        case "typing:status":
          try {
            const sockets = await Promise.all(
              data?.data?.members?.map(async (member: string) => {
                return await this.redisService
                  ?.getClient()
                  .hget("user:sockets", member);
              })
            );
            data?.isTyping
              ? this.io.to(sockets).emit(IS_TYPING, data)
              : this.io.to(sockets).emit(STOP_TYPING, data);
          } catch (error) {
            console.log("error subscribing to typing");
          }
          break;

        case "user:status":
          this.io.to(data?.onlineUsers).emit("userStatusChange", {
            userId: data?.userId,
            status: data?.status,
          });
      }
    });

    // Handle socket connections
    this.io.on("connection", async (socket: CustomSocket) => {
      console.log("connected!");
      const userId = socket?.user?.id;
      await this.handleUserConnection(socket);
      if (userId) {
        try {
          // Get user's groups
          const userGroups = await db.query.groupMembers.findMany({
            where: (groupMembers, { eq }) => eq(groupMembers.userId, userId),
            columns: { groupId: true },
          });

          // Store groups in socket data for later use
          socket.data.userGroups = userGroups;

          // Update Redis with socket mapping for each group
          await this.updateGroupMemberSocket(
            userId,
            socket.id,
            userGroups?.map((g) => g?.groupId)
          );
        } catch (error) {
          console.error("Error setting up group sockets:", error);
        }
      }

      // Handle new messages
      socket.on(NEW_MESSAGE, async (data) => {
        console.log("here triggered");
        await this.handleNewMessage(socket, data);
      });
      //handle group message
      socket.on(NEW_GROUP_MESSAGE, async (data) => {
        await this.handleGroupMessage(socket, data);
      });
      //Mark as read
      socket.on(MARK_MESSAGES_READ, async (data, callback) => {
        await this.handleMarkMessagesRead(socket, data, false);
        callback({ success: true, timestamp: new Date() });
      });
      socket.on(MARK_GROUP_MESSAGES_READ, async (data, callback) => {
        await this.handleMarkMessagesRead(socket, data, true);
        callback({ success: true, timestamp: new Date() });
      });

      // Handle typing status
      socket.on(IS_TYPING, (data) => {
        this.redisService
          .getPublisher()
          .publish(
            "typing:status",
            JSON.stringify({ data, userId: socket.user?.id, isTyping: true })
          );
      });
      socket.on(STOP_TYPING, (data) => {
        this.redisService
          .getPublisher()
          .publish(
            "typing:status",
            JSON.stringify({ data, userId: socket.user?.id, isTyping: false })
          );
      });

      //PINCHATS
      socket.on(
        "pinChat",
        async ({ pinned, isGroup, groupId, userId, chatId }) => {
          try {
            if (!userId) return;
            if (pinned === true) {
              const res = await db.insert(pinnedChats).values({
                userId: userId,
                groupId: isGroup ? groupId : null,
                type: isGroup ? PinType.GROUP : PinType.CHAT,
                chatId: !isGroup ? chatId : null,
              });
              return;
            }
            await db
              .delete(pinnedChats)
              .where(
                or(
                  and(
                    eq(pinnedChats.userId, userId),
                    eq(pinnedChats.chatId, chatId)
                  ),
                  and(
                    eq(pinnedChats.userId, userId),
                    eq(pinnedChats.groupId, groupId)
                  )
                )
              );
            return;
          } catch (error) {
            console.log(error);
            return;
          }
        }
      );
      socket.on(
        "MUTECHAT",
        async ({ mute, groupId, isGroup, userId, chatId }) => {
          try {
            if (!userId) return;
            if (mute === true) {
              const res = await db.insert(mutedChats).values({
                userId: userId,
                groupId: isGroup ? groupId : null,
                type: isGroup ? PinType.GROUP : PinType.CHAT,
                chatId: !isGroup ? chatId : null,
              });
            }
            return await db
              .delete(mutedChats)
              .where(
                and(
                  eq(mutedChats.userId, userId),
                  eq(mutedChats.chatId, chatId)
                )
              );
          } catch (error) {
            console.log(error);
            return;
          }
        }
      );

      // Handle disconnection
      socket.on("disconnect", async () => {
        const user = socket.user;
        const redisClient = this.redisService.getClient();
        if (user?.id) {
          try {
            // Use stored groups from socket data
            const userGroups = socket.data.userGroups || [];

            // Start all Redis operations in parallel
            await Promise.all([
              // Remove user socket mapping
              redisClient.hdel("user:sockets", user.id),

              // Update user online status
              db
                .update(userSchema)
                .set({ isOnline: false })
                .where(eq(userSchema.id, user.id)),

              // Remove socket from all groups
              this.removeGroupMemberSocket(
                socket.id,
                user?.id,
                userGroups?.map((g: { groupId: string }) => g?.groupId)
              ),
            ]);

            // Handle online friends notification after cleanup
            const onlineFriends = await redisClient.smembers(
              `user:${user?.id}:onlineFriends`
            );

            if (onlineFriends.length > 0) {
              const friendsSocketId = await redisClient.hmget(
                "user:sockets",
                ...onlineFriends
              );

              if (friendsSocketId.length > 0) {
                await this.redisService.getPublisher().publish(
                  "user:status",
                  JSON.stringify({
                    onlineUsers: friendsSocketId,
                    userId: user.id,
                    status: "offline",
                  })
                );
              }
            }
          } catch (error) {
            console.error("Error handling disconnect:", error);
          }
        }
      });
    });
  }
}
