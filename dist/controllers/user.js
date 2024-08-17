import { db } from "../drizzle/migrate.js";
import { user } from "../drizzle/schema.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { eq } from "drizzle-orm";
import { sendToken } from "../utils/feature.js";
//!zod for userbody
const newUser = TryCatch(async (req, res, next) => {
    const { username, name, password, avatar } = req.body;
    const result = await db.insert(user).values({
        name, password, avatar, username
    }).returning({
        id: user.id,
        name: user.name
    });
    return res.json({
        success: true,
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
        columns: { name: true, id: true },
        where: (user, { ilike }) => ilike(user.name, `%${filterQuery}%`)
    });
    return res.json({
        success: true,
        users
    });
});
export { newUser, login, searchUser };
