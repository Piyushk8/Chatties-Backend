import { db } from "../drizzle/migrate.js";
import { user } from "../drizzle/schema.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { sendToken } from "../utils/feature.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
//!zod for userbody
const newUser = TryCatch(async (req, res, next) => {
    const { username, name, password } = req.body;
    const file = req.file;
    // console.log(file,username)
    let urls = [];
    if (file)
        urls = await uploadToCloudinary([file]);
    const avatarContainer = urls.length >= 1 ? { url: urls[0], public_id: name } : null;
    if (!username || !password || !name)
        next(new ErrorHandler("Data not sufficient", 400));
    const newUser = await db.insert(user).values({
        name, password, avatar: avatarContainer, username
    }).returning({
        id: user.id,
        name: user.name
    });
    sendToken(res, newUser[0], 200, "User created");
    // emitEvet(())
});
const login = TryCatch(async (req, res, next) => {
    const { username, password } = req.body;
    const result = await db.query.user.findFirst({
        where: (user, { eq }) => eq(user.username, username)
    });
    if (!result)
        return next(new ErrorHandler("User not found", 404));
    if (password != result?.password)
        return next(new ErrorHandler("Incorrect password", 403));
    sendToken(res, { id: result.id, name: result.name }, 200, "login success");
});
const getMyDetails = TryCatch(async (req, res, next) => {
    const userId = res.locals.userId;
    const user = await db.query.user.findFirst({
        where: (user, { eq }) => eq(user.id, userId),
        columns: {
            id: true,
            name: true,
            username: true
        }
    });
    if (!user)
        next(new ErrorHandler("no user found", 404));
    res.json({
        success: true,
        user, isAuth: true
    });
});
const searchUser = TryCatch(async (req, res, next) => {
    const userId = res.locals.userId;
    const filterQuery = req?.query?.filter;
    console.log(filterQuery);
    const users = await db.query.user.findMany({
        columns: { password: false },
        where: (user, { ilike, ne, and }) => and(ilike(user.name, `${filterQuery}%`), ne(user.id, userId))
    });
    return res.json({
        success: true,
        users
    });
});
const logout = TryCatch(async (req, res, next) => {
    const userId = res.locals.userId;
    console.log(userId);
    return res.status(200).cookie("token", "", {
        maxAge: 1000 * 60 * 60 * 24 * 15, sameSite: "none",
        httpOnly: true,
        secure: true
    }).json({
        message: "LoggetOut succesfully!",
        success: true
    });
});
export { logout, newUser, login, searchUser, getMyDetails };
