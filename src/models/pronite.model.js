import mongoose, { Schema } from "mongoose";

const proniteSchema = new Schema({
    userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  adhaar: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  collegeName: {
    type: String,
    trim: true,
   },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  paymentProof: {
    type: String, 
    required: true,
    trim: true,
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
});

export const Pronite = mongoose.model("Pronite", proniteSchema);
