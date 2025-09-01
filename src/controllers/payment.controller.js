import crypto from "crypto";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (amount, receiptId) => {
//   console.log("HEllo")
//   console.log("Razorpay Key:", process.env.RAZORPAY_KEY_ID);
// console.log("Razorpay Secret:", process.env.RAZORPAY_KEY_SECRET);

  const options = {
    amount: amount * 100, 
    currency: "INR",
    receipt: receiptId,
    payment_capture: 1,
  };
  console.log("nop")
  console.log(options," fds")
  return await razorpay.orders.create(options);
};

export const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpay_signature;
};
