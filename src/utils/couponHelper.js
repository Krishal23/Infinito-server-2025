
import Coupon from "../models/coupon.model.js";

/**
 * Validate and apply a coupon
 * @param {String} couponCode - Coupon tag entered by user
 * @param {String} userId - User applying coupon
 * @param {Number} amount - Base amount (before discount)
 * @param {String} expectedCategory - Category coupon must belong to (e.g., "ACCOM")
 * @returns {Object} { couponDiscount, isCouponApplied, couponCode }
 */
export const validateAndApplyCoupon = async (couponCode, userId, amount, expectedCategory) => {
  let couponDiscount = 0;
  let isCouponApplied = false;
  console.log(couponCode,userId,amount,expectedCategory)

  if (!couponCode) {
    return { couponDiscount, isCouponApplied, couponCode: null };
  }

  const coupon = await Coupon.findOne({ couponTag: couponCode.trim().toUpperCase(), isLive: true });
  if (!coupon) {
    return ("Invalid or inactive coupon");
  }

  // Ensure category matches
  if (coupon.category !== expectedCategory) {
    throw new Error(`This coupon is not valid for ${expectedCategory.toLowerCase()}`);
  }

  const now = new Date();

  // Validity period
  if (coupon.validFrom && now < coupon.validFrom) {
    throw new Error("Coupon is not active yet");
  }
  if (coupon.validUpto && now > coupon.validUpto) {
    throw new Error("Coupon expired");
  }

  // Usage limit (global)
  if (coupon.usageLimit && coupon.usedBy.length >= coupon.usageLimit) {
    throw new Error("Coupon usage limit reached");
  }

  // Prevent same user reuse
  const alreadyUsed = coupon.usedBy.some(u => u.userId.toString() === userId.toString());
  if (alreadyUsed) {
  return { couponDiscount: 0, isCouponApplied: false, couponCode: null, message: "You have already used this coupon" };
}


  // Minimum purchase
  if (coupon.minPurchaseAmount && amount < coupon.minPurchaseAmount) {
    throw new Error(`Coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}`);
  }

  // Discount calculation
  if (coupon.couponType === "flat") {
    couponDiscount = coupon.discount;
  } else if (coupon.couponType === "percentage") {
    couponDiscount = Math.floor((coupon.discount / 100) * amount);

    if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
      couponDiscount = coupon.maxDiscountAmount;
    }
  }

  isCouponApplied = true;

  // Track usage
  coupon.usedBy.push({ userId, usedAt: now });
  await coupon.save();

  return { couponDiscount, isCouponApplied, couponCode: coupon.couponTag };
};
