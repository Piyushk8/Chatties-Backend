import { and, count, eq, exists } from "drizzle-orm";
import { db } from "../drizzle/migrate.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import {
  chat,
  chatMembers,
  group,
  groupMembers,
  groupMessages,
  message,
  user,
} from "../drizzle/schema.js";
import { CloudinaryFile } from "../types/types.js";
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from "cloudinary";
import "dotenv";
import { config } from "dotenv";
import { emitEvent, getBase64 } from "../utils/helper.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Request, Response } from "express";
import {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETECH_CHATS,
} from "../constants/events.js";

config({ path: "../.env" });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const createGroup = TryCatch(async (req, res, next) => {
  //MY userid
  const myId = res.locals.userId;
  const { groupName, groupType } = req.body;

  const file = req.file as CloudinaryFile;
  let url: string[] = [];
  if (file) url = await uploadToCloudinary([file]);

  const groupDetails = await db
    .insert(group)
    .values({
      groupImage:url[0],
      groupname: groupName,
      groupType: groupType,
      creatorId: myId,
    })
    .returning();
  const groupMembersDetails = await db
    .insert(groupMembers)
    .values({
      groupId: groupDetails[0].id,
      userId: myId,
      role: "superadmin",
    })
    .returning();

  return res.status(200).json({
    success: true,
    groupDetails,
    groupMembersDetails,
    message: "chat Created!",
  });
});

const getMyGroups = TryCatch(async (req, res, next) => {
  //MY userid
  const myId = res.locals.userId;
  const Groups = await db.query.groupMembers.findMany({
    where: (groupMembers, { eq }) => eq(groupMembers.userId, myId),
    with: {
      group: {
        columns: {
          id: true,
          groupImage: true,
          groupname: true,
          groupType: true,
          lastMessage: true,
        },
      },
    },
    columns:{
      unreadCount:true
    }
  });
   const myGroups =  Groups.map((g)=> ({group:{...g.group,unreadCount:g.unreadCount}}))
  
  return res.status(200).json({
    success: true,
    myGroups,
    message: "group fetched",
  });
});

const getGroupDetails = TryCatch(async (req, res, next) => {
  //MY userid
  const myId = res.locals.userId;
  const { id: groupId } = req.params;

  if (!groupId) return next(new ErrorHandler("Invalid groupId", 400));

  const groupDetails = await db.query.group.findFirst({
    where: (chat, { eq }) => eq(chat.id, groupId),
    columns: { groupname: true, groupImage: true, groupType: true },
  });
  if (!groupDetails) return next(new ErrorHandler("no chat found", 404));

  const groupMembers = await db.query.groupMembers.findMany({
    where: (groupMembers, { eq, ne, and }) =>eq(groupMembers.groupId,groupId),
      // and(eq(groupMembers.groupId, groupId), ne(groupMembers.userId, myId)),
    columns: {
      role: true,
    },
    with: {
      user: {
        columns: {
          name: true,
          id: true,
          avatar: true,
          isOnline: true,
          username: true,
        },
      },
    },
  });

  if (!groupDetails) return next(new ErrorHandler("group not found", 404));

  return res.status(200).json({
    success: true,
    groupDetails,
    groupMembers,
    message: "group details!",
  });
});

const sendGroupMessage = TryCatch(async (req, res, next) => {
  const content = req.body.content;
  const myId = res.locals.userId;
  const { id: groupId } = req.params;

  if (!myId || !groupId || !content)
    return next(new ErrorHandler("invalid credentials", 400));
  const result = await db.insert(groupMessages).values({
    content: content,
    groupId: groupId,
    sender: myId,
  });

  return res.json({
    result,
  });
});
const getGroupMessages = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  // console.log(chatId, "get messages");

  const page: number = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const result = await db.query.groupMessages.findMany({
    where: (groupMessages, { eq }) => eq(groupMessages.groupId, groupId),
    limit: limit,
    offset: offset,
    orderBy: (groupMessages, { desc }) => [desc(groupMessages.lastSent)],
    with: {
      sender: {
        columns: {
          id:true,
          name: true,
          avatar: true,
          username: true,
          isOnline: true,
        },
      },
    },
  });

  // Count total messages for pagination
  const totalMessagesResult = await db
    .select({ count: count(groupMessages.id) })
    .from(groupMessages)
    .where(eq(groupMessages.groupId, groupId));
  const totalMessages = totalMessagesResult[0].count;

  // Return the messages as a JSON response
  const messages = result.reverse();

  return res.json({
    messages,
    totalMessages,
    totalPages: Math.ceil(totalMessages / limit),
  });
});

const SendAttachment = TryCatch(
  async (req: Request<{}, {}, { groupId: string }>, res: Response, next) => {
    const { groupId } = req.body;
    const group = await db.query.group.findFirst({
      where: (group, { eq }) => eq(group.id, groupId),
    });
    const members = await db.query.groupMembers.findMany({
      where: (groupMembers, { eq }) => eq(groupMembers.groupId, groupId),
      columns: {
        userId: true,
      },
    });
    const me = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, res.locals.userId),
    });

    if (!me) return next(new ErrorHandler("Sender Not valid", 403));
    if (!group) return next(new ErrorHandler("group not found", 404));

    const files: CloudinaryFile[] = req.files as CloudinaryFile[];
    if (!files || files.length === 0) {
      return next(new Error("No files provided"));
    }
    const cloudinaryUrls = await uploadToCloudinary(files);
    const messageForDb = {
      content: "",
      sender: me?.id,
      attachment: cloudinaryUrls,
      groupId: groupId,
    };
    const messageForRealTime = {
      ...messageForDb,
      sender: {
        id: me?.id,
        name: me?.name,
        avatar: me?.avatar,
      },
    };
    const result = await db.insert(groupMessages).values(messageForDb);

    const membersId = members.map((i) => i.userId);
    //!emitevent new message || new message Alert
    // emitEvent(req,REFETECH_CHATS,membersId,chatId)
    emitEvent(
      req,
      NEW_MESSAGE,
      [...membersId, res.locals.userId],
      messageForRealTime
    );

    res.status(200).json({
      message: "Done",
    });
  }
);

const deleteGroup = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  const myId = res.locals.userId;
  // console.log(chatId, "get messages");
  const groupName = await db.query.group.findFirst({
    where: (group, { eq }) => eq(group.id, groupId),
    columns: {
      creatorId: true,
    },
  });
  if (groupName?.creatorId !== myId)
    return next(
      new ErrorHandler("you are not authorized to delete group", 400)
    );

  await db.transaction(async (tx) => {
    await tx.delete(group).where(eq(group.id, groupId));
    await tx.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
    await tx.delete(groupMessages).where(eq(groupMessages.groupId, groupId));
  });

  return res.json({
    success: true,
    message: "Group deleted succesfully",
  });
});

const exitGroup = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  const myId = res.locals.userId;
  // console.log(chatId, "get messages");
  const groupName = await db.query.group.findFirst({
    where: (group, { eq }) => eq(group.id, groupId),
    columns: {
      creatorId: true,
    },
  });
  if (groupName?.creatorId !== myId)
    return next(
      new ErrorHandler("make some else super admin before leaving group", 400)
    );

  await db.transaction(async (tx) => {
    await tx
      .delete(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, myId))
      );
  });

  return res.json({
    success: true,
    message: "Group deleted succesfully",
  });
});

const joinGroup = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  const myId = res.locals.userId;
  // console.log(chatId, "get messages");
  const [groupExists,groupMemberCheck] = await Promise.all([
    await db.query.group.findFirst({
      where: (group, { eq }) => eq(group.id, groupId),
    }),
    await db.query.groupMembers.findFirst({
      where:(groupMembers,{eq,and})=>and(eq(groupMembers?.id,groupId),eq(groupMembers?.userId,myId))
    })
  ])
  if (!groupExists) return next(new ErrorHandler("group doesn't exists", 404));
  if (groupMemberCheck) return next(new ErrorHandler("already a member", 404));

  const groupCreated = await db
    .insert(groupMembers)
    .values({
      groupId: groupId,
      userId: myId,
      role: "member",
    })
    .returning();

  return res.json({
    success: true,
    groupExists,
    groupCreated,
    message: "Joined succesfully",
  });
});

const kickMember = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  const { userToBeKicked } = req.body;
  const myId = res.locals.userId;

  if (!userToBeKicked || groupId)
    return next(new ErrorHandler("invalid credentails", 400));
  const [myRole, userToBeKickedRole] = await Promise.all([
    await db.query.groupMembers.findFirst({
      where: (groupMembers, { eq, and }) =>
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, myId)),
      with: {
        group: true,
      },
    }),
    await db.query.groupMembers.findFirst({
      where: (groupMembers, { eq, and }) =>
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userToBeKicked)
        ),
      with: {
        group: true,
      },
    }),
  ]);

  if (!userToBeKicked)
    return next(new ErrorHandler("user to kick not found", 404));
  if (!myRole) return next(new ErrorHandler("user not found", 404));

  switch (myRole?.role) {
    case "superadmin":
      await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.userId, userToBeKicked),
            eq(groupMembers.groupId, groupId)
          )
        );
      break;
    case "admin":
      if (!userToBeKickedRole?.role)
        return next(new ErrorHandler("only super admin can kick admins", 400));
      await db
        .delete(groupMembers)
        .where(
          and(
            eq(groupMembers.userId, userToBeKicked),
            eq(groupMembers.groupId, groupId)
          )
        );
    default:
      return next(
        new ErrorHandler("members are unauthorized for this action", 400)
      );
      break;
  }

  return res.json({
    success: true,
    message: "success",
  });
});

const deleteMessage = TryCatch(async (req, res, next) => {
  const groupId = req.params.id;
  const { messageId } = req.body;
  const myId = res.locals.userId;

  const myRole = await db.query.groupMembers.findFirst({
    where: (groupMembers, { eq, and }) =>
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, myId)),
    with: {
      group: true,
    },
  });
  if (!myRole) return next(new ErrorHandler("user not found", 404));

  switch (myRole?.role) {
    case "superadmin":
      await db.delete(groupMessages).where(eq(groupMessages.id, messageId));
      break;
    case "admin":
      await db.delete(groupMessages).where(eq(groupMessages.id, messageId));
      break;
    default:
      return next(
        new ErrorHandler("members are unauthorized for this action", 400)
      );
      break;
  }

  return res.json({
    success: true,
    message: "success",
  });
});

export {
  deleteMessage,
  deleteGroup,
  exitGroup,
  getGroupMessages,
  sendGroupMessage,
  createGroup,
  getMyGroups,
  getGroupDetails,
  kickMember,
  joinGroup,
  SendAttachment
};


