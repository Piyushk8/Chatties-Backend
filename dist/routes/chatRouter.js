import { Router } from "express";
import { createChat } from "../controllers/chat.js";
import { authMiddleware } from "../middlewares/auth.js";
export const chatRouter = Router();
chatRouter.use(authMiddleware);
chatRouter.post("/new", createChat);
