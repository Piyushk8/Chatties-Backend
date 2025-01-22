import { Request } from "express";
import { redisService, socketService } from "../app.js";
import { CloudinaryFile } from "../types/types.js";

export const getBase64 = (file:CloudinaryFile) => {
    if (!file || !file.buffer) {
      throw new Error("Invalid file or file buffer");
    }
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  };
  
 export  interface userType{
    id:string,
    user:{
      id:string,
      name?:string
    }
  }

  export const getSocketIds =async (users:string[]=[])=>{
  const redisClient =  redisService.getClient()
  const sockets = await redisClient.hmget("user:sockets",...users)
  const socketIds = sockets.filter((s)=>s!==null)
  return socketIds
  }


  export const emitEvent=async(req:Request,event:string,users:string[],data:unknown)=>{
    const userSockets = await getSocketIds(users);
    const io = socketService["io"] 
    io.to(userSockets).emit(event,data)
  }