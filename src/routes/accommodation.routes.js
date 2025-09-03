import express from "express";
import { authenticateUser, verifyAdmin } from "../middlewares/auth.js";
import {
    createAccommodationOrder,
    verifyAccommodationPayment,
    getMyAccommodation,
    getAllAccommodations,
    getAccommodationPricing
} from "../controllers/accommodation.controller.js";

const router = express.Router();

// Get accommodation pricing information (public)
router.get("/pricing", getAccommodationPricing);

// Create accommodation order (authenticated users)
router.post("/create-order", authenticateUser, createAccommodationOrder);

// Verify payment and book accommodation (authenticated users)
router.post("/verify-payment", authenticateUser, verifyAccommodationPayment);

// Get my accommodation details (authenticated users)
router.get("/my-accommodation", authenticateUser, getMyAccommodation);

// Get all accommodations (admin only)
router.get("/all", verifyAdmin, getAllAccommodations);

export default router;