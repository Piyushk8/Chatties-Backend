import { db } from "../drizzle/migrate.js";
import { user } from "../drizzle/schema.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { eq } from "drizzle-orm";
import { sendToken } from "../utils/feature.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
//!zod for userbody
const newUser = TryCatch(async (req, res, next) => {
    const { username, name, password } = req.body;
    const file = req.file;
    console.log(file, username);
    const urls = await uploadToCloudinary([file]);
    const newUser = await db.insert(user).values({
        name, password, avatar: { url: urls[0], public_id: name }, username
    }).returning({
        id: user.id,
        name: user.name
    });
    // sendToken(res,result[0],200,"User created")
    return res.json({
        success: true,
        newUser,
        message: "user created"
    });
    // emitEvet(())   
});
const login = TryCatch(async (req, res, next) => {
    const { username, password } = req.body;
    const result = await db.select({ id: user.id, password: user.password, name: user.name })
        .from(user)
        .where(eq(user.username, username));
    if (!result)
        return next(new ErrorHandler("User not found", 404));
    if (password != result[0].password)
        return next(new ErrorHandler("Incorrect password", 403));
    sendToken(res, result[0], 200, "login success");
    return res.json({
        success: true,
        message: "login sucess"
    });
});
const searchUser = TryCatch(async (req, res, next) => {
    const userId = res.locals.userId;
    const filterQuery = req?.query?.filter;
    const users = await db.query.user.findMany({
        columns: { password: false },
        where: (user, { ilike }) => ilike(user.name, `%${filterQuery}%`)
    });
    return res.json({
        success: true,
        users
    });
});
export { newUser, login, searchUser };
