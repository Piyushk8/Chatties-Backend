
// const TryCatch=(passedfunction:)=> async(req,res,next)=>{
//     try{

import { Response } from "express"

import Jwt from "jsonwebtoken"
const cookieOption = {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'none',
    secure: true, 
};

const sendToken = (res:Response,user:{id:string,name:string},code:number,message:string)=>{
    const token = Jwt.sign(user.id,"JSON_SECRET")
    return res.status(code).cookie("token" ,"Bearer "+ token,{
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        sameSite: 'none',
        secure: true,}
        )
        .json({
        sucsess:true,
        user,
        message
    })
}

export { sendToken}