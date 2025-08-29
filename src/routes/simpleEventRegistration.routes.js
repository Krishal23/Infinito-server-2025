import express from "express";
import { registerSimpleEvent, listSimpleEvents } from "../controllers/simpleEventRegistration.controller.js";

const router = express.Router();

router.post("/register", registerSimpleEvent);
router.get("/list", listSimpleEvents);

export default router;


