import { NextFunction, Request, Response } from "express";
import { db } from "../drizzle/migrate.js";
import { message, user } from "../drizzle/schema.js";
import {
  CloudinaryFile,
  loginRequestBody,
  newUserRequestBody,
} from "../types/types.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { sendToken } from "../utils/feature.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

//!zod for userbody
const newUser = TryCatch(
  async (
    req: Request<{}, {}, newUserRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { username, name, password } = req.body;
    const file: CloudinaryFile = req.file as CloudinaryFile;

    let urls: string[] = [];
    if (file) urls = await uploadToCloudinary([file]);
    const avatarContainer =
      urls.length >= 1 ? { url: urls[0], public_id: name } : null;
    if (!username || !password || !name)
      next(new ErrorHandler("Data not sufficient", 400));
    const userExists = await db.query.user.findFirst({
      where:(user,{eq})=>eq(user.username,username)
    })
    if(userExists) return res.json({success:false,message:"username already exists!"})
    const newUser = await db
      .insert(user)
      .values({
        name,
        password,
        avatar: avatarContainer,
        username,
      })
      .returning({
        id: user.id,
        name: user.name,
      });
    sendToken(res, newUser[0], 200, "User created");

    // emitEvet(())
  }
);

const login = TryCatch(
  async (
    req: Request<{}, {}, loginRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { username, password } = req.body;

    const result = await db.query.user.findFirst({
      where: (user, { eq }) => eq(user.username, username),
    });

    if (!result) return next(new ErrorHandler("User not found", 404));

    if (password != result?.password)
      return next(new ErrorHandler("Incorrect password", 403));

    sendToken(res, { id: result.id, name: result.name }, 200, "login success");
  }
);

const getMyDetails = TryCatch(async (req, res, next) => {
  const userId = res.locals.userId;
  const userDetail = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.id, userId),
    columns: {
      id: true,
      name: true,
      username: true,
      avatar:true
    },
    with: {
      mutedChats:{
        columns:{chatId:true,groupId:true}
      },
      pinnedChats: {
        columns: {
          chatId: true,
          groupId:true
        },
      },
    },
  });
  if (!userDetail) next(new ErrorHandler("no user found", 404));

  // const myPinnedChats = await db.query.pinnedChats.findMany({
  //     where:(pinnedChats,{eq})=>eq(pinnedChats.userId,userId),
  //     columns:{
  //         chatId:true
  //     }

  // })
  const pinnedChatIds = userDetail?.pinnedChats.map((i) => i.chatId || i.groupId);
  const mutedChatIds = userDetail?.mutedChats.map((i) => i.chatId || i.groupId);
  res.json({
    success: true,
    mutedChatIds,
    pinnedChats: pinnedChatIds,
    user: userDetail,
    isAuth: true,
  });
});

const searchUser = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.userId;
    const filterQuery = req?.query?.filter;
    const users = await db.query.user.findMany({
      columns: { password: false },
      where: (user, { ilike, ne, and }) =>
        and(ilike(user.name, `${filterQuery}%`), ne(user.id, userId)),
    });
    return res.json({
      success: true,
      users,
    });
  }
);
const logout = TryCatch(async (req, res, next) => {
  const userId = res.locals.userId;
  return res
    .status(200)
    .cookie("token", "", {
      maxAge: 1000 * 60 * 60 * 24 * 15,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      message: "LoggetOut succesfully!",
      success: true,
    });
});
export { logout, newUser, login, searchUser, getMyDetails };
