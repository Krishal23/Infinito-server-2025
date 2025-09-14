import Coupon from "../models/coupon.model.js";

// Create a new coupon
export const createCoupon = async (req, res) => {
  try {
    let {
      couponTag,
      description,
      couponType,
      discount,
      isLive,
      validFrom,
      validUpto,
      category,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
    } = req.body;

    const createdBy = req.user?._id;

    // Required checks
    if (!couponTag || !couponType || !discount || !validUpto || !category) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Normalize fields
    couponTag = couponTag.trim().toUpperCase();
    couponType = couponType.toLowerCase();

    // Check if coupon already exists
    const existing = await Coupon.findOne({ couponTag });
    if (existing) {
      return res.status(400).json({ message: "Coupon tag already exists" });
    }

    const newCoupon = new Coupon({
      couponTag,
      description,
      couponType,
      discount,
      isLive: isLive ?? true,
      validFrom,
      validUpto,
      category: category.toUpperCase(), // e.g., ACCOM, EVENTS, MERCH, PRONITE
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
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
    let updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "Coupon ID is required" });
    }

    // Normalize fields 
    if (updateData.couponTag) {
      updateData.couponTag = updateData.couponTag.trim().toUpperCase();
    }
    if (updateData.couponType) {
      updateData.couponType = updateData.couponType.toLowerCase();
    }
    if (updateData.category) {
      updateData.category = updateData.category.toUpperCase();
    }

    // If usageLimit is reduced, ensure it's not below current used count
    if (updateData.usageLimit !== undefined) {
      const coupon = await Coupon.findById(id);
      if (!coupon) return res.status(404).json({ message: "Coupon not found" });

      if (coupon.usedBy.length > updateData.usageLimit) {
        return res.status(400).json({
          message: `Cannot set usageLimit below already used count (${coupon.usedBy.length})`,
        });
      }
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true, 
    });

    if (!updatedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
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
    const { amount, category } = req.query; 
    let { code } = req.params; 
    const userId = req.user?._id;
    console.log(req.user)

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    code = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ couponTag: code, isLive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon" });
    }

    const now = new Date();

    // Date checks
    if (coupon.validFrom && now < coupon.validFrom) {
      return res.status(400).json({ success: false, message: "Coupon is not active yet" });
    }
    if (coupon.validUpto && now > coupon.validUpto) {
      return res.status(400).json({ success: false, message: "Coupon has expired" });
    }

    // Category check
    if (category && coupon.category !== category.toUpperCase()) {
      return res.status(400).json({ success: false, message: `Coupon not valid for ${category}` });
    }

    // Usage limit (global)
    if (coupon.usageLimit && coupon.usedBy.length >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    }

    // Per-user check
    const alreadyUsed = userId
      ? coupon.usedBy.some(u => u.userId.toString() === userId.toString())
      : false;

      console.log(userId, " ", alreadyUsed ," ", coupon.usedBy)
    if (alreadyUsed) {
      return res.status(400).json({ // <-- important: set status 400 for already used
        success: false,
        message: "You have already used this coupon",
      });
    }

    // Minimum purchase check
    if (amount && coupon.minPurchaseAmount && Number(amount) < coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Coupon requires a minimum purchase of ₹${coupon.minPurchaseAmount}`,
      });
    }

    // Coupon is valid
    res.status(200).json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        id: coupon._id,
        couponTag: coupon.couponTag,
        description: coupon.description,
        couponType: coupon.couponType,
        discount: coupon.discount,
        category: coupon.category,
        validFrom: coupon.validFrom,
        validUpto: coupon.validUpto,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageLimit: coupon.usageLimit,
        usedByCount: coupon.usedBy.length,
      },
    });

  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};