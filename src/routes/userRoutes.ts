import { Router } from "express";
import { getMyDetails, login, logout, newUser, searchUser } from "../controllers/user.js";
import { authMiddleware } from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";
import { errorMiddleware } from "../middlewares/error.js";


 const userRouter = Router();

userRouter.post("/signup",singleAvatar,newUser)
userRouter.post("/login",login)


userRouter.get("/search",authMiddleware,searchUser)
userRouter.get("/me",authMiddleware,getMyDetails)
userRouter.delete("/logout",authMiddleware,logout)
userRouter.use(errorMiddleware)


export {userRouter}