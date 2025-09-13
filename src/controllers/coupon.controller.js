import Coupon from "../models/coupon.model.js";

// Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    let { couponTag, description, couponType, discount, isLive, validUpto } = req.body;
    const createdBy = req.user?._id;

    if (!couponTag || !couponType || !discount || !validUpto) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Normalize to uppercase
    couponTag = couponTag.trim().toUpperCase();

    // Check if coupon already exists (case-insensitive)
    const existing = await Coupon.findOne({ couponTag });
    if (existing) {
      return res.status(400).json({ message: "Coupon tag already exists" });
    }

    const newCoupon = new Coupon({
      couponTag,
      description,
      couponType: couponType.toLowerCase(), // keep type normalized too
      discount,
      isLive: isLive ?? true,
      validUpto,
      createdBy,
    });

    await newCoupon.save();
    res.status(201).json({ message: "Coupon created successfully", coupon: newCoupon });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Get all coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Update coupon (admin)
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const coupon = await Coupon.findByIdAndUpdate(id, updateData, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    res.status(200).json({ message: "Coupon updated", coupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Delete coupon (admin)
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });

    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};



export const validateCoupon = async (req, res) => {
  try {
    let { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    // normalize input
    code = code.trim().toUpperCase();

    // find by correct field name
    const coupon = await Coupon.findOne({ couponTag: code, isLive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon" });
    }

    // check expiry
    const now = new Date();
    if (coupon.validUpto && coupon.validUpto < now) {
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        id: coupon._id,
        couponTag: coupon.couponTag, // fixed field name
        description: coupon.description,
        couponType: coupon.couponType,
        discount: coupon.discount,
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
