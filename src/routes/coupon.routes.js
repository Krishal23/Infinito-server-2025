import express from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponById
} from "../controllers/coupon.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Admin-only routes
router.post("/", verifyToken, createCoupon);
router.get("/", verifyToken, getCoupons);
router.get("/:id", verifyToken, getCouponById);
router.put("/:id", verifyToken, updateCoupon);
router.delete("/:id", verifyToken, deleteCoupon);
router.get("/validate/:code",verifyToken, validateCoupon);

export default router;
