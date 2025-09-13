import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  couponTag: { type: String, required: true, unique: true },
  description: { type: String },
  couponType: { type: String, enum: ["percentage", "flat"], default: "flat" },
  discount: { type: Number, required: true },
  isLive: { type: Boolean, default: true },
  validUpto: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
