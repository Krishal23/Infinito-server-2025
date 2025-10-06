import express from "express";
import {
  registerForPronite,
  getMyProniteRegistration,
  getAllProniteRegistrations,
  getProniteById,
  deleteProniteRegistration,
} from "../controllers/pronite.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

const proniteRouter = express.Router();

// Static routes first
proniteRouter.post("/register", verifyToken, registerForPronite);
proniteRouter.get("/my-registration", verifyToken, getMyProniteRegistration);
proniteRouter.get("/all-registrations", verifyToken, authorizeRole("admin", "moderator"), getAllProniteRegistrations);

// // Dynamic routes last
proniteRouter.get("/:id", verifyToken, authorizeRole("admin", "moderator"), getProniteById);
proniteRouter.delete("/:id", verifyToken, authorizeRole("admin", "moderator"), deleteProniteRegistration);

export default proniteRouter;
