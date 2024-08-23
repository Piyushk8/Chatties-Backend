import { NextFunction, Request, Response } from "express"
import { TryCatch } from "./error.js"
import jwt, { JwtPayload } from "jsonwebtoken"
import ErrorHandler from "../utils/utility.js"
import { CustomSocket } from "../types/types.js"
import cookieParser from "cookie-parser"

export const authMiddleware = TryCatch(async(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    const tokenBearer = req.cookies.token
    if(!tokenBearer) return next(new ErrorHandler("Unauthorized User access",403))
    const token = tokenBearer.split(" ")[1]
    
    const decodedToken = jwt.verify(token,"JSON_SECRET");
    const user = decodedToken as JwtPayload
    if(!user) return next(new ErrorHandler("Login to Access",401))
    
    res.locals.userId = user.id
    return next()

})



async function authenticateUser(tokenBearer: string): Promise<{id:string, name:string } | null> {
    if (tokenBearer) {
      const token = tokenBearer.split(" ")[1]
      const decodedToken  = jwt.verify(token,"JSON_SECRET")
      
      const user = decodedToken as JwtPayload
     
      return {id:user.id , name:user.name}
    }
    return null;
  }
  


export async function socketAuth(socket: CustomSocket, next: (err?: Error) => void) {
    try {
      const req = socket.request as Request;
  
      // Parse cookies using cookie-parser
      cookieParser()(req, {} as Response, async (err) => {
        if (err) {
          return next(err);
        }
        const tokenBearer = req.cookies?.token;
        
        if (true) {
         
          const user = await authenticateUser(tokenBearer);
         
          if (user) {
          socket.user = user;
            return next();
          }
          if(!user)return next(new ErrorHandler("Please login to access",401)) 
        }
        
        // If authentication fails, pass an error to the next middleware
        
      });
      
    } catch (error) {
      next(error as Error);
    }
  }