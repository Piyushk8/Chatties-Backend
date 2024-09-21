import {  NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/utility.js";
import { ControllerType } from "../types/types.js";


export const errorMiddleware=(err:ErrorHandler
    ,req:Request,
    res:Response,
    next:NextFunction
)=>{
  
    err.message||=""
    return res.status(err.statusCode).json({
        success:false,
        message:err.message
    })
    
}


export const TryCatch=(func:ControllerType)=> async(req:Request,
    res:Response,
    next:NextFunction
)=>{
    Promise.resolve(func(req,res,next)).catch((err)=>next(err))
};

