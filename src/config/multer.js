import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js"; // the file we just made

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "paymentProofs", // Cloudinary folder
    format: async (req, file) => file.mimetype.split("/")[1], // keep original format
    public_id: (req, file) => Date.now() + "-" + file.originalname,
  },
});

export const upload = multer({ storage });
