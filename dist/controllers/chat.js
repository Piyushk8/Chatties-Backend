import { db } from "../drizzle/migrate.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { chat, chatMembers } from "../drizzle/schema.js";
const createChat = TryCatch(async (req, res, next) => {
    //MY userid
    const myId = res.locals.userId;
    //members userid
    const { userId } = req.body;
    console.log(userId, myId);
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
    console.log(me, member);
    if (!me || !member)
        return next(new ErrorHandler("User not exist", 404));
    const result = await db.insert(chat).values({
        chatname: (me.name + member.name),
    }).returning({
        chatId: chat.id
    });
    console.log(result);
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
    // emitEvent(
    //     req,REFETECH_CHATS,members
    // )
    return res.status(200).json({
        success: true,
        message: "chat Created!"
    });
});
export { createChat };
