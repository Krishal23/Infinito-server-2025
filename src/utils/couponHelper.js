import Coupon from "../models/coupon.model.js";

export const validateAndApplyCoupon = async (couponCode, userId, amount, expectedCategory) => {
  let couponDiscount = 0;
  let isCouponApplied = false;
  let appliedCoupon = null;
  console.log(couponCode)

  if (!couponCode) return { couponDiscount, isCouponApplied, couponCode: null, appliedCoupon: null, message: null };


  const coupon = await Coupon.findOne({ couponTag: couponCode.trim().toUpperCase(), isLive: true });
  if (!coupon) return { couponDiscount, isCouponApplied, couponCode: null, appliedCoupon: null, message: "Invalid or inactive coupon" };

  if (coupon.category !== expectedCategory) throw new Error(`This coupon is not valid for ${expectedCategory.toLowerCase()}`);

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) throw new Error("Coupon is not active yet");
  if (coupon.validUpto && now > coupon.validUpto) throw new Error("Coupon expired");
  if (coupon.usageLimit && coupon.usedBy.length >= coupon.usageLimit) throw new Error("Coupon usage limit reached");

  const alreadyUsed = coupon.usedBy.some(u => u.userId.toString() === userId.toString());
  if (alreadyUsed) return { couponDiscount: 0, isCouponApplied: false, couponCode: null, appliedCoupon: null, message: "You have already used this coupon" };

  if (coupon.minPurchaseAmount && amount < coupon.minPurchaseAmount) throw new Error(`Coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}`);

  // Calculate discount
  if (coupon.couponType === "flat") {
    couponDiscount = coupon.discount;
  } else if (coupon.couponType === "percentage") {
    couponDiscount = Math.floor((coupon.discount / 100) * amount);
    if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
      couponDiscount = coupon.maxDiscountAmount;
    }
  }

  isCouponApplied = true;
  appliedCoupon = coupon; // store reference for later marking


  return { couponDiscount, isCouponApplied, couponCode: coupon.couponTag, appliedCoupon };
};
