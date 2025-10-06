import { Accommodation } from "../models/accommodation.model.js";
import { EVENT_MODELS } from "../models/EventModelFinal.js";
import { User } from "../models/user.model.js";
import Coupon from "../models/coupon.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { validateAndApplyCoupon } from "../utils/couponHelper.js";
import { Transaction } from "../models/transaction.model.js";
import { sendAccommodationBookingEmail } from "../utils/emails/templates/accommodationMail.js";
import cloudinary from "../config/cloudinary.js"; // Cloudinary config


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper: Check if event exists
const isValidEventId = async (eventId) => {
  for (const modelName in EVENT_MODELS) {
    const model = EVENT_MODELS[modelName];
    const exists = await model.exists({ _id: eventId });
    if (exists) return true;
  }
  return false;
};



// Save accommodation without payment
export const createAccommodationWithoutPayment = async (req, res) => {
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });

    let { eventId, genderCategory, eventName, checkInDate, stayDays, meals, players, couponCode } = req.body;
    console.log(req.body);

    if (!eventId || !genderCategory || !checkInDate || !stayDays || !players) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if event exists
    const eventExists = await isValidEventId(eventId);
    if (!eventExists) return res.status(404).json({ message: "Event not found" });

    // Parse players
    let playersData = players;
    if (typeof players === "string") {
      try {
        playersData = JSON.parse(players);
        if (!Array.isArray(playersData)) throw new Error();
      } catch {
        return res.status(400).json({ message: "Invalid players format" });
      }
    }

    // Parse meals
    let mealsData = meals;
    if (typeof meals === "string") {
      try {
        mealsData = JSON.parse(meals);
      } catch {
        return res.status(400).json({ message: "Invalid meals format" });
      }
    }

    // Compute check-out date
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (Number(stayDays) - 1));

    // Accommodation fee
    const accommodationFee = 250 * playersData.length * stayDays;

    // Create mealsTracking per player
    const playersWithMeals = playersData.map(player => {
      const mealsTracking = [];
      if (mealsData && typeof mealsData === "object") {
        Object.entries(mealsData).forEach(([dateStr, dayMeals]) => {
          const slots = ["breakfast", "lunch", "dinner"].map(mealType => ({
            type: mealType,
            taken: !!dayMeals[mealType],
          }));
          mealsTracking.push({ date: new Date(dateStr), slots });
        });
      }
      return { ...player, mealsTracking };
    });

    // Upload payment proof if provided
    let paymentProofUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "paymentProofs",
      });
      paymentProofUrl = result.secure_url;
    }

    // Coupon
    let couponDiscount = 0;
    let isCouponApplied = false;
    if (couponCode) {
      try {
        const result = await validateAndApplyCoupon(couponCode, userId, accommodationFee, "ACCOM");
        couponDiscount = result.couponDiscount;
        isCouponApplied = result.isCouponApplied;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    // Create accommodation record
    const newAccommodation = new Accommodation({
      userId,
      eventId,
      genderCategory,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      players: playersWithMeals,
      accommodationFee,
      couponCode: couponCode || null,
      couponDiscount,
      isCouponApplied,
      paymentStatus: "pending",
      status: "pending",
      createdBy: userId.toString(),
      paymentProof: paymentProofUrl,
      eventName,
    });

    console.log(newAccommodation)

    // Mark coupon as used
    if (couponCode) {
      const appliedCoupon = await Coupon.findOne({ couponTag: couponCode });
      if (appliedCoupon) {
        appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
        await appliedCoupon.save();
      }
    }



    await newAccommodation.save();

    // Link to user
    await User.findByIdAndUpdate(userId, {
      $push: { accommodations: newAccommodation._id },
    });

    // Send confirmation email safely (txn/payment may be null)
    const user = await User.findById(userId).select("email fullname");
    await sendAccommodationBookingEmail(
      newAccommodation,
      user,
      { id: "N/A", order_id: "N/A", registrationFee: newAccommodation.totalAmount },
      { method: "N/A", _id: newAccommodation._id }
    );

    res.status(201).json({
      message: "Accommodation saved successfully (without payment)",
      accommodation: newAccommodation,
      totalAmount: newAccommodation.totalAmount,
    });
  } catch (error) {
    console.error("Error saving accommodation without payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const createAccommodationOrder = async (req, res) => {
  try {

    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });
    console.log(req.body)

    const { eventId, genderCategory, checkInDate, stayDays, meals, players, couponCode } = req.body;
    console.log(req.body)

    if (!eventId || !genderCategory || !checkInDate || !stayDays || !players || players.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }



    // Check event existence
    const eventExists = await isValidEventId(eventId);
    if (!eventExists) return res.status(404).json({ message: "Event not found" });


    // Compute checkout date
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (Number(stayDays) - 1));


    // ---- Fee Calculation ----
    const accommodationFee = 250 * players.length * stayDays;

    const mealRates = {
      breakfast: 80,
      lunch: 80,
      dinner: 80,
    };

    let messFee = 0;
    if (meals && typeof meals === "object") {
      Object.values(meals).forEach((dayMeals) => {
        Object.entries(dayMeals).forEach(([mealType, selected]) => {
          if (selected && mealRates[mealType]) {
            messFee += mealRates[mealType] * players.length;
          }
        });
      });
    }

    let couponDiscount = 0;
    let isCouponApplied = false;
    let appliedCouponCode = null;
    let appliedCoupon = null;
    console.log(couponCode, " rhe")

    try {
      const result = await validateAndApplyCoupon(couponCode, userId, accommodationFee, "ACCOM");
      couponDiscount = result.couponDiscount;
      isCouponApplied = result.isCouponApplied;
      appliedCouponCode = result.couponCode;
      appliedCoupon = result.appliedCoupon;
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }


    const totalAmount = accommodationFee + messFee - couponDiscount;
    console.log(accommodationFee, " + ", messFee, " - ", couponDiscount, " ", couponCode)


    // Shorten ObjectId + timestamp
    const shortUserId = userId.toString().slice(-10); // take last 10 chars
    const timestamp = Date.now().toString().slice(-10); // last 10 digits
    const receipt = `acc_${shortUserId}_${timestamp}`;
    console.log(totalAmount, "total Amnt")

    // ---- Create Razorpay Order ----
    const order = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: receipt,
    });

    res.status(201).json({
      message: "Order created successfully",
      orderId: order.id,
      amount: totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
      accommodationData: {
        userId,
        eventId,
        genderCategory,
        checkInDate,
        stayDays,
        players,
        accommodationFee,
        couponCode,
        couponDiscount,
        isCouponApplied,
        meals,
        messFee,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Error creating accommodation order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




export const verifyAccommodationPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, accommodationData } = req.body;
    const userId = req?.user?._id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !accommodationData) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    // ---- Verify Razorpay Signature ----
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ message: "Invalid signature, payment verification failed" });
    }

    // ---- Fetch full payment details from Razorpay ----
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // ---- Map Razorpay status to your enum ----
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

    // ---- Compute checkout date ----
    const checkIn = new Date(accommodationData.checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + (Number(accommodationData.stayDays) - 1));



    const playersWithMeals = accommodationData.players.map((player) => {
      const mealsTracking = [];

      if (accommodationData.meals && typeof accommodationData.meals === "object") {
        Object.entries(accommodationData.meals).forEach(([dateStr, dayMeals]) => {
          const slots = ["breakfast", "lunch", "dinner"].map((mealType) => ({
            type: mealType,
            taken: !!dayMeals[mealType], // true if selected, false if not
          }));
          mealsTracking.push({ date: new Date(dateStr), slots });
        });
      }

      return {
        ...player,
        mealsTracking,
      };
    });

    // ---- Save Accommodation ----
    const newAccommodation = new Accommodation({
      userId,
      eventId: accommodationData.eventId,
      genderCategory: accommodationData.genderCategory,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      players: playersWithMeals,
      accommodationFee: accommodationData.accommodationFee,
      couponCode: accommodationData.couponCode || null,
      couponDiscount: accommodationData.couponDiscount || 0,
      isCouponApplied: accommodationData.isCouponApplied || false,
      totalAmount: accommodationData.totalAmount,
      paymentOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      paymentSignature: razorpay_signature,
      paymentStatus: "paid",
      status: "confirmed",
      createdBy: userId.toString(),
    });

    if (accommodationData.couponCode) {
      const appliedCoupon = await Coupon.findOne({ couponTag: accommodationData.couponCode });
      if (appliedCoupon) {
        appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
        await appliedCoupon.save();
      }
    }


    await newAccommodation.save();

    await User.findByIdAndUpdate(userId, {
      $push: { accommodations: newAccommodation._id },
    });

    // ---- Save to global Transaction collection ----
    const transactionData = {
      userId,
      event: "Accommodation",
      registrationId: newAccommodation._id,
      orderId: payment.order_id,
      paymentId: payment.id,
      signature: razorpay_signature,
      amount: payment.amount, // paise
      registrationFee: payment.amount / 100, // rupees
      currency: payment.currency,
      status: transactionStatus,
      method: payment.method,
      createdAt: payment.created_at ? new Date(payment.created_at * 1000) : undefined,
    };

    // Method-specific details
    if (payment.method === "card" && payment.card) {
      transactionData.card = {
        last4: payment.card.last4,
        network: payment.card.network,
        issuer: payment.card.issuer,
        type: payment.card.type,
      };
    } else if (payment.method === "upi") {
      transactionData.upiVpa = payment.vpa || null;
      transactionData.upiTransactionId = payment.acquirer_data?.rrn || null;
    } else if (payment.method === "wallet") {
      transactionData.wallet = payment.wallet || null;
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // ---- Link Accommodation to Transaction ----
    newAccommodation.transactionId = transaction._id;
    await newAccommodation.save();

    // Fetch user details
    const user = await User.findById(userId).select("email fullname");

    console.log("Accommodation booked & payment verified:", { newAccommodation, transaction });

    // Send confirmation email
    await sendAccommodationBookingEmail(newAccommodation, user, payment, transaction);


    res.status(200).json({
      message: "Payment verified & accommodation booked successfully",
      accommodation: newAccommodation,
      transaction,
    });
  } catch (error) {
    console.error("Error verifying accommodation payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




// Update a meal slot for a specific player
export const updateMealSlot = async (req, res) => {
  try {
    const userId = req?.user?._id; // logged-in user
    const { accommodationId, playerEmail, date, mealType, taken } = req.body;

    if (!accommodationId || !playerEmail || !date || !mealType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const accommodation = await Accommodation.findOne({
      _id: accommodationId,
      userId, // ensure only the owner can update
    });

    // console.log(accommodationId, " ", accommodation)
    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    // Find the player
    const player = accommodation.players.find(p => p.email === playerEmail);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    // Find the date entry
    const mealDate = new Date(date).toDateString();
    const dayTracking = player.mealsTracking.find(mt => new Date(mt.date).toDateString() === mealDate);

    if (!dayTracking) {
      return res.status(404).json({ message: "Meal tracking for this date not found" });
    }

    // Find the meal slot
    const slot = dayTracking.slots.find(s => s.type === mealType);
    if (!slot) {
      return res.status(404).json({ message: "Meal type not found" });
    }

    // Update the slot
    slot.taken = taken;
    slot.verifiedAt = new Date();
    slot.verifiedBy = userId.toString();

    await accommodation.save();
    // console.log(accommodation)
    accommodation.players.forEach(player => {
      console.log(`\nPlayer: ${player.name} (${player.email})`);
      player.mealsTracking.forEach(tracking => {
        const dateStr = tracking.date.toISOString().split('T')[0];
        const mealsStatus = tracking.slots.map(slot => `${slot.type}: ${slot.taken ? '✅' : '❌'}`).join(', ');
        console.log(`  ${dateStr} -> ${mealsStatus}`);
      });
    });

    res.status(200).json({ message: "Meal slot updated successfully", accommodation });
  } catch (error) {
    console.error("Error updating meal slot:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};



export const getAccommodation = async (req, res) => {
  try {
    const { eventId, userId } = req.query;

    // Build dynamic filter
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;

    const accommodations = await Accommodation.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "fullname email _id", // populate user info
      });

    if (!accommodations || accommodations.length === 0) {
      return res.status(404).json({ message: "No accommodation found" });
    }

    // You can now directly return eventName from document
    res.status(200).json({
      message: "Accommodation fetched successfully",
      count: accommodations.length,
      accommodations,
    });
  } catch (error) {
    console.error("Error fetching accommodation:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};


export const getMyAccommodations = async (req, res) => {
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });

    const accommodations = await Accommodation.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "fullname email _id", // populate user info
      });
    console.log(accommodations)

    if (!accommodations.length) {
      return res.status(404).json({ message: "No accommodations found for this user" });
    }

    res.status(200).json({
      message: "Accommodations fetched successfully",
      count: accommodations.length,
      accommodations,
    });
  } catch (error) {
    console.error("Error fetching accommodations:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
