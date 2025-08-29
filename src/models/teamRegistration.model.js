import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) { return /^\d{10}$/.test(v); },
            message: "Phone number must be 10 digits"
        }
    }
}, { _id: false });

const teamRegistrationSchema = new mongoose.Schema({
    event: {
        type: String, required: true, enum: [
            "football", "basketball", "volleyball", "cricket", "kabaddi"
        ]
    },

    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    teamName: { type: String, trim: true },

    captain: { type: contactSchema, required: true },
    viceCaptain: { type: contactSchema, required: true },

    collegeName: { type: String, required: true, trim: true },
    collegeAddress: { type: String, required: true, trim: true },

    notes: { type: String, trim: true, maxlength: 500 },

    registrationFee: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    status: { type: String, enum: ["pending", "confirmed", "cancelled", "waitlisted"], default: "pending" },

}, { timestamps: true });

teamRegistrationSchema.index({ event: 1, teamName: 1 }, { unique: false });

export const TeamRegistration = mongoose.model("TeamRegistration", teamRegistrationSchema);


