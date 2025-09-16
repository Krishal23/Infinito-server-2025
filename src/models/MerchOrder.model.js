import mongoose from "mongoose";

const { Schema, model } = mongoose;

const merchOrderSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Shipping / personal details
    name: {
      first: { type: String, required: true },
      last: { type: String, required: true },
    },
    adhaarId: { type: String, required: false },
    email: { type: String, required: true },
    address: { type: String, required: true },
    pincode: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    phoneNumber: { type: String, required: true },
    delivery:{type: Boolean, default: false},

    // Purchased merch products
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1, min: 1 },
        priceAtPurchase: { type: Number, required: true },
        size:{ type: String, enum: ["S", "M", "L", "XL", "XXL"], default: "M" },
      },
    ],

    // Total order amount
    totalAmount: { type: Number, required: true },

    // Coupons
    isCouponApplied: { type: Boolean, default: false },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },

    // Payment info
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    paymentOrderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
    paymentStatus: { type: String, default: "pending" },

    // Order status
    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "processing",
    },

    //  delivery / tracking info
    trackingNumber: { type: String, default: null },
    estimatedDelivery: { type: Date, default: null },
  },
  {
    timestamps: true, 
  }
);

merchOrderSchema.virtual("totalItems").get(function () {
  return this.products.reduce((acc, item) => acc + item.quantity, 0);
});

export const MerchOrder = model("MerchOrder", merchOrderSchema);
