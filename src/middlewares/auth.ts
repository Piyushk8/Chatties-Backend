import { NextFunction, Request, Response } from "express"
import { TryCatch } from "./error.js"
import jwt from "jsonwebtoken"
import ErrorHandler from "../utils/utility.js"

export const authMiddleware = TryCatch(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    const tokenBearer = req.cookies.token
    const token = tokenBearer.split(" ")[1]

    const user = jwt.verify(token,"JSON_SECRET");
    if(!user) return next(new ErrorHandler("Login to Access",401))
    
    res.locals.userId= user;
    return next()

})