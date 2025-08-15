import express from "express";
import { getMe,getAllUsers } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"
import { authorizeRole } from "../middlewares/authorizeRole.js";

const userRouter = express.Router();

userRouter.get("/me", verifyToken, getMe);
userRouter.get("/all-users",verifyToken,authorizeRole("admin","moderator"),getAllUsers);

export default userRouter;
