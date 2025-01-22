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
} from "../drizzle/schema.js";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  InitialUsersStatus,
  IS_TYPING,
  NEW_MESSAGE,
  STOP_TYPING,
} from "../constants/events.js";
import { json } from "drizzle-orm/mysql-core";

export class SocketService {
  private io: Server;
  private redisService: RedisService;

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

  private async getSocketIds(friendsIds: string[]) {
    if (friendsIds.length == 0) return undefined;
    console.log("friendIds", friendsIds);
    const Sockets = await this.redisService
      .getClient()
      .hmget("user:sockets", ...friendsIds);
    console.log("all online users", Sockets);
    const socketIds = Sockets.filter((s) => s !== null);
    return socketIds;
  }

  private initialize() {
    // Subscribe to Redis channels
    const subscriber = this.redisService.getSubscriber();
    subscriber.subscribe("chat:messages", "user:status", "typing:status");

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
          } catch (error) {
            console.log("error subscribing message");
          }
          break;

        case "typing:status":
          try {
            const sockets = await Promise.all(
              data?.data?.members?.map(async (member: string) => {
                return await this.redisService
                  ?.getClient()
                  .hget("user:sockets", member);
              })
            );
            this.io.to(sockets).emit(STOP_TYPING, data);
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
      await this.handleUserConnection(socket);

      // Handle new messages
      socket.on(NEW_MESSAGE, async (data) => {
        await this.handleNewMessage(socket, data);
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

      // Handle disconnection
      socket.on("disconnect", async () => {
        const user = socket.user;
        const redisClient = this.redisService.getClient();
        if (user?.id) {
          await redisClient.hdel("user:sockets", user.id);
          await db
            .update(userSchema)
            .set({ isOnline: false })
            .where(eq(userSchema.id, user.id));

          const onlineFriends = await redisClient.smembers(
            `user:${user?.id}:onlineFriends`
          );
          const friendsSocketId = await redisClient.hmget(
            "user:sockets",
            ...onlineFriends
          );
          if (friendsSocketId.length === 0) return;
          await this.redisService.getPublisher().publish(
            "user:status",
            JSON.stringify({
              onlineUsers: friendsSocketId,
              userId: socket.user?.id,
              status: "offline",
            })
          );
        }
      });
    });
  }

  private async handleNewMessage(socket: CustomSocket, data: any) {
    const user = socket.user;
    const { chatId, members, message } = data;

    try {
      // Prepare message data
      const messageData = {
        content: message,
        sender: user?.id,
        chatId: chatId,
        createdAt: new Date().toISOString(),
      };
      //send realtime feedback to user
      socket.emit(NEW_MESSAGE, messageData);
      // Store message in Redis for real-time delivery
      await this.redisService.getPublisher().publish(
        "chat:messages",
        JSON.stringify({
          chatId,
          message: messageData,
          members,
        })
      );

      // Store in database
      //@ts-ignore
      const result = await db.insert(MessageSchema).values({
        content: message,
        sender: user?.id,
        chatId: chatId,
      });

      // Update chat's last message
      if (result) {
        await db
          .update(chat)
          .set({ lastMessage: message, unread: true })
          .where(eq(chat.id, chatId));
      }
    } catch (error) {
      socket.emit("MESSAGE_ERROR", error);
      console.error("Error handling new message:", error);
    }
  }
}
