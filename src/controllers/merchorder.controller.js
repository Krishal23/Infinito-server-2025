import { User } from "../models/user.model.js";
import Coupon from "../models/coupon.model.js";
import { Transaction } from "../models/transaction.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { validateAndApplyCoupon } from "../utils/couponHelper.js";
import { MerchOrder } from "../models/MerchOrder.model.js";
import { Product } from "../models/Product.model.js";
import { sendMerchOrderEmail } from "../utils/emails/templates/merchMail.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const deliveryCharge = 20;

// Create Merch Order 
export const createMerchOrder = async (req, res) => {
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });

    let { products, name, adhaarId, email, address, delivery, pincode, phoneNumber, gender, couponCode } = req.body;
    // console.log(req.body)
    if (!delivery) delivery = false;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: "No products selected" });
    }

    // Fetch product details
    const productDocs = await Product.find({
      _id: { $in: products.map(p => p.productId) },
    });

    if (productDocs.length !== products.length) {
      return res.status(404).json({ message: "Some products not found" });
    }

    // Calculate total
    let totalAmount = 0;
    const merchProducts = products.map(p => {
      const prod = productDocs.find(pd => pd._id.toString() === p.productId);
      const quantity = p.quantity || 1;
      totalAmount += prod.price * quantity;
      return {
        product: prod._id,
        quantity,
        priceAtPurchase: prod.price,
        size: p.size || "M",
      };
    });


    let couponDiscount = 0;
    let isCouponApplied = false;
    let appliedCouponCode = null;
    let appliedCoupon = null;

    if (couponCode) {
      try {
        const result = await validateAndApplyCoupon(couponCode, userId, totalAmount, "MERCH");
        couponDiscount = result.couponDiscount;
        isCouponApplied = result.isCouponApplied;
        appliedCouponCode = result.couponCode;
        appliedCoupon = result.appliedCoupon;
        totalAmount -= couponDiscount;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }
    if (delivery) totalAmount += deliveryCharge;

    // Razorpay receipt
    const shortUserId = userId.toString().slice(-10);
    const timestamp = Date.now().toString().slice(-10);
    const receipt = `merch_${shortUserId}_${timestamp}`;



    console.log(totalAmount, couponDiscount, isCouponApplied, appliedCouponCode);
    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: totalAmount * 100, // paise
      currency: "INR",
      receipt,
    });

    res.status(201).json({
      message: "Merch order created successfully",
      orderId: order.id,
      amount: totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
      merchOrderData: {
        user: userId,
        products: merchProducts,
        name,
        adhaarId,
        email,
        address,
        phoneNumber,
        delivery,
        pincode,
        gender,
        isCouponApplied,
        couponCode: appliedCouponCode,
        couponDiscount,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Error creating merch order:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

// Verify Merch Payment
export const verifyMerchPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, merchOrderData } = req.body;
    const userId = req?.user?._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !merchOrderData) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // Signature verification
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign).digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid signature, payment verification failed" });
    }

    // Fetch payment from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const transactionStatus = (() => {
      switch (payment.status.toLowerCase()) {
        case "created":
        case "authorized":
          return "PENDING";
        case "captured":
          return "SUCCESS";
        case "failed":
          return "FAILED";
        default:
          return "PENDING";
      }
    })();

    // Save Merch Order
    const newMerchOrder = new MerchOrder({
      ...merchOrderData,
      user: userId,
      paymentOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentSignature: razorpay_signature,
      paymentStatus: transactionStatus,
    });

    // Save Transaction
    const transaction = new Transaction({
      userId,
      event: "MerchOrder",
      registrationId: newMerchOrder._id,
      orderId: payment.order_id,
      paymentId: payment.id,
      signature: razorpay_signature,
      amount: payment.amount,
      registrationFee: payment.amount / 100,
      currency: payment.currency,
      status: transactionStatus,
      method: payment.method,
      createdAt: payment.created_at ? new Date(payment.created_at * 1000) : undefined,
    });

    newMerchOrder.transactionId = transaction._id;

    await Promise.all([newMerchOrder.save(), transaction.save()]);

    // Update products
    for (let p of merchOrderData.products) {
      await Product.findByIdAndUpdate(p.product, {
        $inc: { totalPurchased: p.quantity },
        $addToSet: {
          purchasedBy: userId,
          orderRef: newMerchOrder._id,
        },
      });
    }

    // Update user
    await User.findByIdAndUpdate(userId, { $push: { merchOrders: newMerchOrder._id } });

    // Update coupon usage
    if (merchOrderData.isCouponApplied && merchOrderData.couponCode) {
      const coupon = await Coupon.findOne({ couponTag: merchOrderData.couponCode });
      if (coupon) {
        coupon.usedBy.push({ userId, usedAt: new Date() });
        await coupon.save();
      }
    }

    // Fetch user details
    const user = await User.findById(userId).select("email fullname");

    // Send confirmation email
    await sendMerchOrderEmail(newMerchOrder, user, transaction);


    res.status(200).json({
      message: "Merch payment verified & order placed successfully",
      merchOrder: newMerchOrder,
      transaction,
    });
  } catch (error) {
    console.error("Error verifying merch payment:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
