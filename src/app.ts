import express from "express"
import { mainRouter } from "./routes/mainRouter.js";
import cookieParser from "cookie-parser";
import cors from "cors"
import  { createServer } from "http"
import { Server } from "socket.io";
import { CustomSocket } from "./types/types.js";
import { I_AM_OFFLINE, I_AM_ONLINE, IS_TYPING, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USER, REFETECH_CHATS, STOP_TYPING } from "./constants/events.js";
import { uuid } from "drizzle-orm/pg-core";
import { getSockets, userType } from "./utils/helper.js";
import { db } from "./drizzle/migrate.js";
import { socketAuth } from "./middlewares/auth.js";
import { NextFunction} from "express"
import {chat, message as MessageSchema ,user as userSchema} from "./drizzle/schema.js"
import { getMyFriendsSockets } from "./utils/getMyFriendsSockets.js";
import { eq } from "drizzle-orm";
import { errorMiddleware } from "./middlewares/error.js";
import { pinChat } from "./utils/feature.js";

const app = express();
const server = createServer(app)

const allowedOrigins =  [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.CLIENT_URL||""
].filter(Boolean)

const io = new Server(server,{
  cors:{
  origin:allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true}
})
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(cors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
    optionsSuccessStatus: 204
  }))
  
  
  export const socketIds = new Map();
  export const onlineUsers = new Set(); 


    app.get("/",(req,res,next)=>{
      res.send("hello server pingged")
    })
   app.use("/api/v1",mainRouter)
   app.set("io",io);
   io.use(socketAuth);


export async function getOnlineUsers() {
  const onlineUsers = await db.select({ id: userSchema.id })
  .from(userSchema)
  .where(eq(userSchema.isOnline, true));
  return onlineUsers.map(u => u.id);
}


io.on("connection", async(socket:CustomSocket )=>{
  const user = socket.user;
  socketIds.set(user?.id, socket.id);
  console.log(socket.id,user?.id,"connected")
 // console.log(socketIds,user)
  if(user?.id){ //online users update
    console.log("user chekc")
    await db.update(userSchema) 
    .set({isOnline:true})
    .where(eq(userSchema?.id,user?.id))
    let userId = user.id
    
    const onlineUsers = await getOnlineUsers();
   //console.log(onlineUsers)
    io.emit(ONLINE_USER, {onlineUsers});
  }

  
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    //the message for real-time updates
    const messageForRealTime = {
      content: message,
      sender: {
        id: user?.id,
        name: user?.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };
    // Emit the new message to the relevant sockets
  // All members including sender console.log(members,"members")
    const membersAndME:userType[] = [...members,{user}]
    const membersSocket = getSockets(membersAndME);
    const AlertMembersSockets = getSockets(members)
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
  //  socket.broadcast.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
  io.to(AlertMembersSockets).emit(NEW_MESSAGE_ALERT,{chatId})
    try {
      // Validate the required fields
      //  the message for database insertion
      const messageForDB = {
        content: message,        
        sender: user?.id,         
        chatId: chatId,            
      };
      if (!message || !user?.id || !chatId) {
        console.error('Missing required fields:', { message, user, chatId });
        return;
      }
  
     console.log('Message to be inserted:', messageForDB);
     // Inserting the message into the database
      
      //@ts-ignore
     const result = await db.insert(MessageSchema).values(messageForDB);
     if(result) {
       await db.update(chat).set({lastMessage:message,unread:true})
        .where(eq(chat.id,chatId))
        }
      console.log('Insert result:', result);
      
    } catch (error) {
      console.error('Error inserting message:', error);
    }
  });
  

  socket.on(IS_TYPING,(data)=>{
    console.log("typing")
    const {members,chatId} = data;
    const userSockets = getSockets(members);
    socket.to(userSockets).emit(IS_TYPING,{chatId})
  })
  socket.on(STOP_TYPING,(data)=>{
    console.log("stopped")
    const {members,chatId} = data;
    const userSockets = getSockets(members);
    socket.to(userSockets).emit(STOP_TYPING,{chatId})
  })
  socket.on("pinChat",({chatId,pinned,userId})=>{
    
    //  console.log("pinned chat",userId,chatId)
    pinChat(chatId,userId,pinned,socket?.id)}
  )


  socket.on("disconnect", async()=>{
       console.log(`${socket.id} disconencted`)
       socketIds.delete(user?.toString())

       const userId = socketIds.get(socket.id)
       if(user?.id) {
        await db.update(userSchema)
        .set({isOnline:false})
        .where(eq(userSchema?.id,user.id))
        const onlineUsers = await getOnlineUsers();
        io.emit("userStatusChange",{userId:user.id})
      }

  })
   
})



const PORT =3000;
server.listen(PORT, ()=>{
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`)
})

