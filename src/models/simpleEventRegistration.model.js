import mongoose from "mongoose";

const simpleEventRegistrationSchema = new mongoose.Schema({
    event: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    collegeAddress: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: false },
    userId: { type: String, trim: true },
    extras: { type: Object, default: {} }
}, { timestamps: true });

export const SimpleEventRegistration = mongoose.model("SimpleEventRegistration", simpleEventRegistrationSchema);


