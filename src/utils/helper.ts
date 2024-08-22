import { Request } from "express";
import { socketIds } from "../app.js";
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

  export const getSockets =(users:userType[]=[])=>{
    // console.log(users,"users")
    const sockets =  users.map((user:userType)=>{
      return socketIds.get(user?.user.id)})
    return sockets;
  }
  export const getSocketIds =(users:string[]=[])=>{
    // console.log(users,"users")
    const sockets =  users.map((user)=>{
      return socketIds.get(user)})
    return sockets;
  }


  export const emitEvent=(req:Request,event:string,users:string[],data:unknown)=>{
    const userSockets = getSocketIds(users);
    const io = req.app.get("io");
    io.to(userSockets).emit(event,data)
  }