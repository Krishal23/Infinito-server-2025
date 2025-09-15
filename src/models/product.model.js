import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Product Schema
const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    sizeAvailable: {
      type: [String],
      enum: ["S", "M", "L", "XL", "XXL"],
    },
    description: {
      type: String,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        altText: {
          type: String,
          default: "",
        },
      },
    ],
    additionalDetails: {
      type: Map,
      of: String, // Any extra info like color, size, edition, etc.
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Reference to the user who added the product
    },
    totalPurchased: {
      type: Number,
      default: 0, // Tracks total number of purchases
    },
    purchasedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Users who purchased this product
      },
    ],
    orderRef: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MerchOrder", // Reference to orders containing this product
      },
    ],
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);


productSchema.virtual("formattedPrice").get(function () {
  return `₹${this.price.toLocaleString()}`;
});

export const Product = model("Product", productSchema);
