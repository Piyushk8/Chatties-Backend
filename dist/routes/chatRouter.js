import { Router } from "express";
import { createChat, deleteChat, getChatDetails, getMessages, getMyChats, SendAttachment } from "../controllers/chat.js";
import { authMiddleware } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";
export const chatRouter = Router();
chatRouter.use(authMiddleware);
// chatRouter.post("/newMessage",sendMessage)
chatRouter.post("/message", attachmentsMulter, SendAttachment);
chatRouter.post("/new", createChat);
chatRouter.get("/my", getMyChats);
chatRouter.get("/message/:id", getMessages);
chatRouter.delete("/:id", deleteChat);
chatRouter.get("/:id", getChatDetails);
