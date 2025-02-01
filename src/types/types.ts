import { NextFunction, Request, Response } from "express";
import { Socket } from "socket.io";
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    }
  }
}



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
    mimetype: string;
    path: string;
    filename: string;
  }




export interface CustomSocket extends Socket {
    user?: {
        id: string;
        name: string;
        // Add other properties as needed
    };
}