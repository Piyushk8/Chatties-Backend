import { Router } from "express";
import { login, newUser, searchUser } from "../controllers/user.js";
import { authMiddleware } from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";
const userRouter = Router();
userRouter.post("/signup", singleAvatar, newUser);
userRouter.post("/login", login);
userRouter.use(authMiddleware);
userRouter.get("/search", searchUser);
//get my profile 
//search user
//logout
export { userRouter };
