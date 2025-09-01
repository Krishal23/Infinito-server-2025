import mongoose from "mongoose";
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: String, required: true }, 
  registrationId: { type: mongoose.Schema.Types.ObjectId, refPath: "event" }, 

  orderId: { type: String, required: true },
  paymentId: { type: String },
  signature: { type: String },

  amount: { type: Number, required: true }, 
  currency: { type: String, default: "INR" },

  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

transactionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Transaction = mongoose.model("Transaction", transactionSchema);

