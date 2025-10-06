import mongoose from "mongoose";

// -------------------- Meals Tracking Schema --------------------
const mealSlotSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
    taken: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
  },
  { _id: false }
);


const mealsTrackingSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    slots: [mealSlotSchema],
  },
  { _id: false }
);


// -------------------- Individual Player Schema --------------------
const playerAccommodationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    aadharId: { type: String, required: true, trim: true },
    mealsTracking: [mealsTrackingSchema],
  },
  { _id: false }
);

// -------------------- Accommodation Schema --------------------
const accommodationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    eventName: { type: String},
    genderCategory: { type: String, enum: ["male", "female", "mixed"], required: true },

    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    accommodationDays: { type: Number, default: 0 },

    players: [playerAccommodationSchema],

    // Fees & totals
    accommodationFee: { type: Number, default: 0 },
    mealsFee: { type: Number, default: 0 },
    // totalMealsEntitled: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    // Coupons
    isCouponApplied: { type: Boolean, default: false },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },

    // Payment info
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    paymentOrderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    paymentProof: {
    type: String, // store the file path or filename
    required: false,
  },

    // Booking status
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },

    // Audit
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

// -------------------- Middleware --------------------
accommodationSchema.pre("save", function (next) {
  // Calculate accommodation days
  if (this.checkInDate && this.checkOutDate) {
    const diffTime = this.checkOutDate.getTime() - this.checkInDate.getTime();
    this.accommodationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Meal rates
  const mealRates = { breakfast: 80, lunch: 80, dinner: 80 };

  // Generate meals tracking per player and total meals
  this.totalMealsEntitled = 0;
  this.mealsFee = 0;

  if (this.players && this.players.length > 0) {
    this.players.forEach(player => {
      // Generate default mealsTracking if not present
      if (!player.mealsTracking || player.mealsTracking.length === 0) {
        const tracking = [];
        let current = new Date(this.checkInDate);
        for (let i = 0; i < this.accommodationDays; i++) {
          tracking.push({
            date: new Date(current),
            slots: [
              { type: "breakfast" },
              { type: "lunch" },
              { type: "dinner" },
            ],
          });
          current.setDate(current.getDate() + 1);
        }
        player.mealsTracking = tracking;
      }

      // Count total meals and calculate fees
      player.mealsTracking.forEach(day => {
        day.slots.forEach(slot => {
          if (slot.taken) { // only count meals that are selected/taken
            this.mealsFee += mealRates[slot.type] || 0;
          }
        });
      });

      // Total meals
      this.totalMealsEntitled += player.mealsTracking.length * 3;
    });
  }

  // Calculate total amount
  this.totalAmount = (this.accommodationFee || 0) + (this.mealsFee || 0) - (this.couponDiscount || 0);
  if (this.totalAmount < 0) this.totalAmount = 0;

  next();
});

export const Accommodation = mongoose.model("Accommodation", accommodationSchema);
