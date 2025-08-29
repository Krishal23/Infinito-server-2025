import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { registerTeam, getMyTeam } from "../controllers/teamRegistration.controller.js";

const router = express.Router();

// Register a team for a team-sport (matches Infi forms)
router.post("/register", authenticateUser, registerTeam);

// Get my team (optionally filter by event)
router.get("/my", authenticateUser, getMyTeam);

export default router;


