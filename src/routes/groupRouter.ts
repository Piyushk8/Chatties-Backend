import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { attachmentsMulter, singleAvatar } from "../middlewares/multer.js";
import { errorMiddleware } from "../middlewares/error.js";
import { createGroup, exitGroup, getAttachments, getGroupDetails, getGroupMessages, getMyGroups, joinGroup, kickMember, searchGroups, SendAttachment, sendGroupMessage } from "../controllers/group.js";
export const groupRouter = Router();
groupRouter.use(authMiddleware)
groupRouter.post("/new",singleAvatar,createGroup)
groupRouter.post("/attachment",attachmentsMulter,SendAttachment)
groupRouter.get("/my",getMyGroups)
groupRouter.get("/search",searchGroups)
groupRouter.get("/attachments/:id",getAttachments)
groupRouter.get("/:id",getGroupDetails)
groupRouter.post("/:id",sendGroupMessage)
groupRouter.get("/messages/:id",getGroupMessages)
groupRouter.post("/:id/kick",kickMember)
groupRouter.delete('/:id',exitGroup)
groupRouter.post("/join/:id",joinGroup)
groupRouter.use(errorMiddleware)

