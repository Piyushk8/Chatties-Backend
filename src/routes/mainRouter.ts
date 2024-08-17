import { Router } from "express"
import { userRouter } from "./userRoutes.js"
import { chatRouter } from "./chatRouter.js"
 
export const mainRouter = Router()
mainRouter.use("/user",userRouter)
mainRouter.use("/chat",chatRouter)

