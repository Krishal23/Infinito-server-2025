import express from "express";
import { getMe,getAllUsers,updateRole } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"
import { authorizeRole } from "../middlewares/authorizeRole.js";

const userRouter = express.Router();

userRouter.get("/me", verifyToken, getMe);
userRouter.get("/all-users",verifyToken,authorizeRole("admin","moderator"),getAllUsers);
userRouter.get("update-role/:id",verifyToken,authorizeRole("admin"),updateRole)

export default userRouter;
