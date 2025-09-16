import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
  {
    last4: { type: String },
    network: { type: String },
    issuer: { type: String },
    type: { type: String }, // debit/credit
  },
  { _id: false } 
);

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  event: { type: String, required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, refPath: "event" },

  orderId: { type: String, required: true },
  paymentId: { type: String },
  signature: { type: String },

  amount: { type: Number, required: true },  // paise
  registrationFee: { type: Number },         // rupees
  currency: { type: String, default: "INR" },

  // New fields from Razorpay
  method: { type: String },                  // upi, card, netbanking, wallet
  upiVpa: { type: String },                  // user@oksbi, etc.
  upiTransactionId: { type: String },        // bank UPI txn id (RRN)
  wallet: { type: String },                  // paytm, phonepe wallet name
  card: cardSchema,

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
