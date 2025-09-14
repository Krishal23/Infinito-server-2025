import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { createMerchOrder, verifyMerchPayment } from "../controllers/merchorder.controller.js";

const merchOrderRoutes = express.Router();

merchOrderRoutes.post("/create-order", verifyToken,createMerchOrder );
merchOrderRoutes.post("/verify-order", verifyToken, verifyMerchPayment);

export default merchOrderRoutes;
