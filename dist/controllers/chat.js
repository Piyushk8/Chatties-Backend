import { count, eq } from "drizzle-orm";
import { db } from "../drizzle/migrate.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { chat, chatMembers, message } from "../drizzle/schema.js";
import { v2 as cloudinary } from "cloudinary";
import "dotenv";
import { config } from "dotenv";
import { emitEvent } from "../utils/helper.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { REFETECH_CHATS } from "../constants/events.js";
config({ path: "../.env" });
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});
const createChat = TryCatch(async (req, res, next) => {
    //MY userid
    const myId = res.locals.userId;
    //members userid
    const { userId } = req.body;
    if (!userId || !myId)
        return next(new ErrorHandler("internal error", 500));
    const me = await db.query.user.findFirst({
        columns: { name: true },
        where: (user, { eq }) => eq(user.id, myId)
    });
    const member = await db.query.user.findFirst({
        columns: { name: true },
        where: (user, { eq }) => eq(user.id, userId)
    });
    if (!me || !member)
        return next(new ErrorHandler("User not exist", 404));
    //My existing chats
    const ExistingChats = await db.query.chatMembers.findMany({
        columns: { chatId: true },
        where: (chatMembers, { eq }) => eq(chatMembers.userId, myId)
    });
    const ExistingChatsIds = ExistingChats.map((chats) => chats.chatId);
    //checking for Users Chats with me 
    const usersExistingChats = await db.query.chatMembers.findMany({
        // columns:{chatId:true},
        where: (chatMembers, { inArray, eq }) => inArray(chatMembers.chatId, ExistingChatsIds) && eq(chatMembers.userId, userId)
    });
    if (usersExistingChats.length > 0)
        return res.json({
            message: "Opening chat",
            exists: true,
            chatId: usersExistingChats[0].chatId,
            success: true
        });
    //creating new chat if not exists
    const result = await db.insert(chat).values({
        chatname: (me.name + "-" + member.name),
    }).returning({
        chatId: chat.id
    });
    const createdchatId = result[0].chatId;
    if (!createdchatId)
        return next(new ErrorHandler("internal server error", 500));
    const addMeResult = await db.insert(chatMembers).values({
        chatId: createdchatId,
        userId: myId
    });
    const userAddResult = await db.insert(chatMembers).values({
        chatId: createdchatId,
        userId: userId
    });
    emitEvent(req, REFETECH_CHATS, [userId, myId], "");
    return res.status(200).json({
        success: true,
        message: "chat Created!",
        exists: false,
        chatId: createdchatId
    });
});
const getChatDetails = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    // console.log(chatId)
    // console.log(res.locals.userId)
    const chatName = await db.query.chat.findFirst({
        where: (chat, { eq }) => eq(chat.id, chatId),
        columns: { chatname: true }
    });
    const members = await db.query.chatMembers.findMany({
        where: (chatMembers, { eq, ne, and }) => and(eq(chatMembers.chatId, chatId), ne(chatMembers.userId, res.locals.userId)),
        with: {
            user: {
                columns: {
                    name: true,
                    id: true,
                    avatar: true
                }
            }
        },
    });
    //console.log(members);
    res.status(200).json({
        success: true,
        members
    });
});
const getMyChats = TryCatch(async (req, res, next) => {
    const userId = res.locals.userId;
    const myChats = await db.query.chatMembers.findMany({
        where: (chatMembers, { eq }) => eq(chatMembers.userId, userId),
        columns: { chatId: true }
    });
    const chatIds = myChats.map((chat) => chat.chatId);
    const transformedChat = await db.query.chatMembers.findMany({
        where: (chatMembers, { inArray, ne }) => inArray(chatMembers.chatId, chatIds) && ne(chatMembers.userId, userId),
        with: {
            user: {
                columns: {
                    password: false,
                    createdAt: false,
                    username: false
                }
            },
            chat: {
                columns: { lastMessage: true, lastSent: true }
            }
        }
    });
    res.status(200).json({
        success: true,
        transformedChat
    });
});
const sendMessage = TryCatch(async (req, res, next) => {
    const content = req.body.content;
    const result = await db.insert(message).values({
        content: content,
        chatId: "2d4c1301-d416-4314-8a77-8f084b625ba6",
        sender: "c2b880ac-0c49-449d-aa75-7d9d1738ce47"
    });
    return res.json({
        result
    });
});
const getMessages = TryCatch(async (req, res, next) => {
    const chatId = req.params.id;
    // console.log(chatId, "get messages");
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const result = await db.query.message.findMany({
        where: (message, { eq }) => eq(message.chatId, chatId),
        limit: limit,
        offset: offset,
        orderBy: (message, { desc }) => [desc(message.createdAt)],
        with: {
            sender: true
        }
    });
    // Count total messages for pagination
    const totalMessagesResult = await db.select({ count: count(message.id) })
        .from(message)
        .where(eq(message.chatId, chatId));
    const totalMessages = totalMessagesResult[0].count;
    // Return the messages as a JSON response
    const messages = result.reverse();
    return res.json({
        messages,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit)
    });
});
export default getMessages;
const SendAttachment = TryCatch(async (req, res, next) => {
    // console.log(req.file)
    const { chatId } = req.body;
    const chat = await db.query.chat.findFirst({
        where: (chat, { eq }) => eq(chat.id, chatId)
    });
    const me = await db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, res.locals.userId)
    });
    if (!me)
        return next(new ErrorHandler("Sender Not valid", 403));
    if (!chat)
        return next(new ErrorHandler("chat not found", 404));
    const files = req.files;
    console.log(files);
    if (!files || files.length === 0) {
        return next(new Error('No files provided'));
    }
    const cloudinaryUrls = await uploadToCloudinary(files);
    console.log(cloudinaryUrls);
    const messageForDb = {
        content: "",
        sender: me?.id,
        attachment: cloudinaryUrls,
        chatId: chatId
    };
    const messageForRealTime = {
        ...messageForDb,
        sender: {
            id: me?.id,
            name: me?.name,
            avatar: me?.avatar
        }
    };
    const result = await db.insert(message).values(messageForDb);
    //!emitevent new message || new message Alert
    res.status(200).json({
        message: "Done"
    });
});
export { SendAttachment, getChatDetails, getMyChats, sendMessage, createChat, getMessages };
