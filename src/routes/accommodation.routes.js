import express from "express";
import { createAccommodation, getAccommodation, updateMealSlot } from "../controllers/accommodation.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

router.post("/",verifyToken, createAccommodation);

router.put("/meal-slot", verifyToken, updateMealSlot);

router.get("/",verifyToken, getAccommodation);

export default router;