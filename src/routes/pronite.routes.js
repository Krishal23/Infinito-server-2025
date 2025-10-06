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
import { upload } from "../config/multer.js"; // multer + cloudinary storage

const proniteRouter = express.Router();

// Only this route needs file upload
proniteRouter.post(
  "/register",
  verifyToken,
//   upload.single("paymentProof"),
  registerForPronite
);

// Other routes
proniteRouter.get("/my-pronite", verifyToken, getMyProniteRegistration);
// router.get("/all-pronite",verifyToken, authorizeRole("admin"),  getAllProniteRegistrations);
proniteRouter.get("/all-pronite", verifyToken, authorizeRole("admin"), getAllProniteRegistrations);
proniteRouter.get("/:id", verifyToken, authorizeRole("admin"), getProniteById);
proniteRouter.delete("/:id", verifyToken, authorizeRole("admin"), deleteProniteRegistration);

export default proniteRouter;
