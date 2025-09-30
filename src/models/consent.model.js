import mongoose from "mongoose";


//-------------------- Consent Schema --------------------
const consentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    issue: {
        type: String,
        enum: ["events", "accommodation", "merch", "other"],
        required: true
    },
    description: {
        type: String,
        maxlength: 500,
        required: true
    },
    consentDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

export default mongoose.model("Consent", consentSchema);

