
import { Response } from "express"

import Jwt from "jsonwebtoken"
import { db } from "../drizzle/migrate.js";
import { pinnedChats } from "../drizzle/schema.js";
import { and, eq } from "drizzle-orm";

const cookieOption = {
    maxAge: 1000 * 60 * 60 * 24, 
    sameSite: 'none',
    secure: true, 
};

const sendToken = (res:Response,user:{id:string,name:string},code:number,message:string)=>{
    const token =  Jwt.sign(user,"JSON_SECRET")
    return res.status(code).cookie("token" ,"Bearer "+ token,{
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'none',
        secure: true,}
        )
        .json({
        success:true,
        user,
        message
    })
}

const pinChat = async(chatId:string,userId:string,pinned:boolean,socketId:string)=>{
    console.log("pinhcat function",pinned,chatId,userId)
    try {
        if(pinned){
            //console.log("pinhcat started",chatId,userId)
            const pinChats = await db.insert(pinnedChats).values({chatId:chatId,userId:userId})
            console.log("pinhcat compleeted")
            console.log(pinChats)
            
        }
        else{
            const pinChat = await db.delete(pinnedChats).where(and( eq(pinnedChats.userId,userId),eq(pinnedChats.chatId,chatId)))
            console.log(pinChat)
        }
    } catch (error) {
        console.log(error)   
    }
}

export { sendToken,pinChat}




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
  
  
