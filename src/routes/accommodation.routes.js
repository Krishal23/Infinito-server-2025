import express from "express";
import {  createAccommodationOrder, createAccommodationWithoutPayment, getAccommodation, getMyAccommodations, updateMealSlot, verifyAccommodationPayment } from "../controllers/accommodation.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { upload } from "../config/multer.js";

const router = express.Router();

// router.post("/",verifyToken, createAccommodation);


router.post("/book", verifyToken,upload.single("paymentProof"), createAccommodationWithoutPayment);
// router.post("/create-order", verifyToken, createAccommodationOrder);
router.post("/verify-payment", verifyToken, verifyAccommodationPayment);

router.put("/meal-slot", verifyToken, updateMealSlot);

router.get("/",verifyToken, getAccommodation);
router.get("/my-accom",verifyToken, getMyAccommodations);

export default router;