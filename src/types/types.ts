import { NextFunction, Request, Response } from "express";
import { chat, chatMembers, message, user } from "../drizzle/schema.js";
import {  Multer } from 'multer'; 
import { Socket } from "socket.io";
export interface newUserRequestBody {
    name:string,
    username:string,
    password:string,
    avatar?:JSON,
}export interface  loginRequestBody extends Request {
    username:string,
    password:string
}

export type ControllerType = (req: Request, 
     res: Response, 
     next: NextFunction) => Promise<void | Response<any, Record<string, any>>>



export interface CloudinaryFile extends Express.Multer.File {
    buffer: Buffer;
  }




export interface CustomSocket extends Socket {
    user?: {
        id: string;
        name: string;
        // Add other properties as needed
    };
}