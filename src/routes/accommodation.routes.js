import express from "express";
import {  createAccommodationOrder, getAccommodation, getMyAccommodations, updateMealSlot, verifyAccommodationPayment } from "../controllers/accommodation.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// router.post("/",verifyToken, createAccommodation);


router.post("/create-order", verifyToken, createAccommodationOrder);
router.post("/verify-payment", verifyToken, verifyAccommodationPayment);

router.put("/meal-slot", verifyToken, updateMealSlot);

router.get("/",verifyToken, getAccommodation);
router.get("/my-accom",verifyToken, getMyAccommodations);

export default router;