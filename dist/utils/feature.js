// const TryCatch=(passedfunction:)=> async(req,res,next)=>{
//     try{
import Jwt from "jsonwebtoken";
// import { broadcastOnlineUsers } from "../app.js";
const cookieOption = {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'none',
    secure: true,
};
const sendToken = (res, user, code, message) => {
    const token = Jwt.sign(user, "JSON_SECRET");
    return res.status(code).cookie("token", "Bearer " + token, {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'none',
        secure: true,
    })
        .json({
        sucsess: true,
        user,
        message
    });
};
export { sendToken };
// export async function handleUserOnline(userId: string) {
//    console.log("Handleonlineuser")
//     await db.update(user)
//       .set({ isOnline: true })
//       .where(eq(user.id, userId));
//     await broadcastOnlineUsers();
//   }
// export  async function handleUserOffline(userId: string) {
//     console.log("Handleofflineuser")
//     await db.update(user)
//       .set({ isOnline: false })
//       .where(eq(user.id, userId));
//     await broadcastOnlineUsers();
//   }
