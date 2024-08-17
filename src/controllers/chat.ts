import { eq } from "drizzle-orm";
import { db } from "../drizzle/migrate.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { chat, chatMembers, message, user } from "../drizzle/schema.js";
import { CloudinaryFile } from "../types/types.js";
import {v2 as cloudinary , UploadApiErrorResponse,UploadApiResponse } from "cloudinary"
import "dotenv"
import { config } from "dotenv"
import { getBase64 } from "../utils/helper.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Request, Response } from "express";

config({path:"../.env"})
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME
    ,api_key:process.env.CLOUDINARY_API_KEY
    ,api_secret:process.env.CLOUDINARY_SECRET_KEY
})


const createChat = TryCatch(async(req,res,next)=>{
    //MY userid
    const myId = res.locals.userId;
    
    //members userid
    const {userId} = req.body
    console.log(userId,myId)
    if(!userId || !myId) return next(new ErrorHandler("internal error",500))
    const me = await db.query.user.findFirst({
        columns:{name:true},
        where:(user,{eq})=>eq(user.id,myId) 
    })
    const member = await db.query.user.findFirst({
        columns:{name:true},
        where:(user,{eq})=>eq(user.id,userId) 
    })
    console.log(me  , member)
    
    if(!me || !member) return next(new ErrorHandler("User not exist",404))

    const result = await db.insert(chat).values({
        chatname:(me.name+"-"+member.name),
    }).returning({
        chatId:chat.id
    })

    console.log(result)

    const createdchatId:string = result[0].chatId
    if(!createdchatId) return next(new ErrorHandler("internal server error",500))
    const addMeResult = await db.insert(chatMembers).values({
        chatId:createdchatId,
        userId:myId
    })
    const userAddResult = await db.insert(chatMembers).values({
        chatId:createdchatId,
        userId:userId
    })
    // emitEvent(
    //     req,REFETECH_CHATS,members
    // )
     return res.status(200).json({
        success:true,
        message:"chat Created!"
    })

})

const getChatDetails= TryCatch(async(req,res,next)=>{
    const chatId = req.params.id;
    console.log(chatId)
   const chat = await db.query.chat.findMany({
    where:(chat,{eq})=> eq(chat.id,chatId)
   })
    console.log(chat)
    res.status(200).json({
        success:true,
        chat
    })
})

const getMyChats= TryCatch(async(req,res,next)=>{
    const userId = res.locals.userId;

    // const mychats = await db.query.chatMembers.findMany({
    //     where:(chat,{eq})=>eq(chat.userId,userId)
    // })
    const myChats = await db.query.chatMembers.findMany({
        where:(chatMembers,{eq})=>eq(chatMembers.userId,userId),
       columns:{chatId:true}
    })

    const chatIds = myChats.map((chat)=>chat.chatId)

    const transformedChat = await db.query.chatMembers.findMany({
        where:(chatMembers,{inArray,ne})=> inArray(chatMembers.chatId,chatIds) && ne(chatMembers.userId,userId),
        with:{
            user:true
        }
    })

   
    res.status(200).json({
        success:true,
        transformedChat
        
    })
})

const sendMessage = TryCatch(async(req,res,next)=>{
const content = req.body.content;

    const result = await db.insert(message).values({
        content:content,
        chatId:"2d4c1301-d416-4314-8a77-8f084b625ba6",
        sender:"c2b880ac-0c49-449d-aa75-7d9d1738ce47"
    })
    return res.json({
        result
    })
})

const getMessages = TryCatch(async(req,res,next)=>{

    const chatId = req.params.id;
    const {page} = req.body 
    const offset = (page-1)*10
    
    const messages = await db.query.message.findMany({
        where:(message,{eq})=> eq(message.chatId,chatId),
        limit:10,
        offset:offset
    })
    return res.json({
        messages
    })
})

const SendAttachment = TryCatch(async(req:Request<{},{},{chatId:string}>
    ,res:Response
    ,next)=>{
    const{ chatId } = req.body
    const chat = await db.query.chat.findFirst({
        where:(chat,{eq})=>eq(chat.id,chatId)})
    const me = await db.query.user.findFirst({
        where:(user,{eq})=>eq(user.id,res.locals.userId)
    })
    if(!me) return next(new ErrorHandler("Sender Not valid",403))
    if (!chat) return next(new ErrorHandler("chat not found" ,404))
    
        
    const files: CloudinaryFile[] = req.files as CloudinaryFile[];
    console.log(files)
    if (!files || files.length === 0) {
        return next(new Error('No files provided'));
    }
    const cloudinaryUrls = await uploadToCloudinary(files)
    console.log(cloudinaryUrls)

    const messageForDb = {
        content:"",
        sender:me?.id,
        attachment:cloudinaryUrls,
        chatId:chatId
    } 
    const messageForRealTime = {
        ...messageForDb,
        sender:{
            id:me?.id,
            name:me?.name,
            avatar:me?.avatar
        }
    }
    const result = await db.insert(message).values(messageForDb)

    //!emitevent new message || new message Alert


res.status(200).json({
    message:"Done"

})
})



export {
    SendAttachment,
    getChatDetails,
 getMyChats,
 sendMessage,
 createChat
 ,getMessages
}