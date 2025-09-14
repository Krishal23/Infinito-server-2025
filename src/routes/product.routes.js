import express from "express";
import { createProducts, getProducts,getProductById } from "../controllers/product.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const productRoutes = express.Router();

productRoutes.post("/create-product",verifyToken, createProducts);
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProductById);

export default productRoutes;
