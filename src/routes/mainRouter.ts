import { Router } from "express"
import { userRouter } from "./userRoutes.js"
import { chatRouter } from "./chatRouter.js"
import { groupRouter } from "./groupRouter.js"
 
export const mainRouter = Router()
mainRouter.use("/user",userRouter)
mainRouter.use("/chat",chatRouter)
mainRouter.use("/group",groupRouter)

