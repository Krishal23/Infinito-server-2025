import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponTag: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      uppercase: true 
    },

    description: { 
      type: String, 
      trim: true 
    },

    category: { 
      type: String, 
      enum: ["MERCH", "EVENTS", "PRONITE", "ACCOM"], 
      required: true 
    },

    couponType: { 
      type: String, 
      enum: ["percentage", "flat"], 
      default: "flat" 
    },

    discount: { 
      type: Number, 
      required: true, 
      min: [0, "Discount must be positive"] 
    },

    maxDiscountAmount: { 
      type: Number, 
      default: null // useful for percentage coupons (optional)
    },

    minPurchaseAmount: { 
      type: Number, 
      default: 0 // ensures coupon applies only above certain order value
    },

    isLive: { 
      type: Boolean, 
      default: true 
    },

    validFrom: { 
      type: Date, 
      default: Date.now 
    },

    validUpto: { 
      type: Date, 
      required: true 
    },

    usageLimit: { 
      type: Number, 
      default: null // null → unlimited usage
    },

    usedBy: [
      { 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
        usedAt: { type: Date, default: Date.now } 
      }
    ],

    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
