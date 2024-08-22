import { NextFunction, Request, Response } from "express";
import { db } from "../drizzle/migrate.js";
import { user  } from "../drizzle/schema.js";
import { CloudinaryFile, loginRequestBody, newUserRequestBody } from "../types/types.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility.js";
import { eq, ne } from "drizzle-orm";
import {  sendToken } from "../utils/feature.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { uuid } from "drizzle-orm/pg-core";

//!zod for userbody
const newUser = TryCatch(async(req:Request<{},{},newUserRequestBody>
    ,res:Response
    ,next:NextFunction)=>{
    const {username,name,password}= req.body 
    const file: CloudinaryFile = req.file as CloudinaryFile;
    // console.log(file,username)
    let urls:string[] = []
    if(file)  urls = await uploadToCloudinary([ file])
    const avatarContainer = urls.length >=1 ? {url:urls[0],public_id:name} : null
    if (!username || !password || !name) next (new ErrorHandler("Data not sufficient",400))
    
    
    const newUser =await db.insert(user).values({
        name,password,avatar:avatarContainer,username
    }).returning({
        id:user.id,
        name:user.name
    })
    // console.log(username,name,password,avatarContainer)
    // console.log(newUser)
   sendToken(res,newUser[0],200,"User created")

 
    // emitEvet(())
    })

const login =  TryCatch(async(
    req:Request<{},{},loginRequestBody>
    ,res:Response
    ,next:NextFunction)=>{

    const {username,password}= req.body

    const result = await db.query.user.findFirst({
    where:(user,{eq})=> eq(user.username,username)
   })
   
   if(!result) return next(new ErrorHandler("User not found",404))
    
    if (password!=result?.password) return next(new ErrorHandler("Incorrect password",403))
    
    sendToken(res,{id:result.id, name:result.name},200,"login success")
    
    // await handleUserOnline(result.id);
   

  
})

const getMyDetails = TryCatch(async(req,res,next)=>{

    const userId = res.locals.userId
    const user = await db.query.user.findFirst({
        where:(user,{eq})=>eq(user.id,userId),
        columns:{
            id:true,
            name:true,
            username:true

        }
    })
    if( !user) next(new ErrorHandler("no user found",404))
    res.json({

success:true,
user    })

})

const searchUser = TryCatch(async(req:Request,
    res:Response,
    next:NextFunction
)=>{
    const userId  = res.locals.userId;
    
   const filterQuery = req?.query?.filter
    
   const users = await db.query.user.findMany({
    columns:{password:false},
    where:(user,{ilike,ne})=> ilike(user.name ,`%${filterQuery}%`) && ne(user.id,userId)
    
})
    return res.json({
        success:true,
        users
   })
})

export{
    newUser,login,searchUser,getMyDetails
}