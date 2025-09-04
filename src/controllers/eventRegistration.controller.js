import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { createOrder } from "./payment.controller.js";
import crypto from "crypto";
import ErrorHandler from "../utils/ErrorHandler.js";
import { EVENT_MODELS } from "../models/eventRegistration.model.js";
import { sendEventRegistrationEmail } from "../utils/emails/templates/sendEventRegistrationEmail.js";
import Razorpay from "razorpay";

// fees in rs
const EVENT_FEES = JSON.parse(process.env.EVENT_FEES);


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function getEventFee(eventKey, category) {
    let feeData = EVENT_FEES[eventKey];
    if (!feeData) throw new Error(`Fee not configured for event: ${eventKey}`);

    if (feeData.fee) {
        feeData = feeData.fee;
    }

    if (typeof feeData !== "object") return feeData;

    const cat = (category || "open").toLowerCase();
    const fee = feeData[cat];

    if (!fee) throw new Error(`Fee not configured for ${eventKey} (${cat})`);
    return fee;
}


function toEventKey(k) {
    return String(k).toLowerCase().replace(/\s+/g, "_");
}
export const createEventOrder = (eventKey) => {
    return CatchAsyncErrror(async (req, res, next) => {
        try {
            const userId = req.user._id;

            const EventModel = EVENT_MODELS[toEventKey(eventKey)];
            if (!EventModel) return next(new ErrorHandler("Invalid event", 400));

            const existing = await EventModel.findOne({ userId });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "You are already registered for this event",
                    registration: existing,
                });
            }

            const category = req?.body?.category || "open";
            const amount = getEventFee(eventKey, category);
            const receipt = `${eventKey}_${userId.toString().slice(-10)}_${Date.now().toString().slice(-6)}`;
            const order = await createOrder(amount, receipt);

            await Transaction.create({
                userId,
                event: toEventKey(eventKey),
                orderId: order.id,
                amount,
                category: category.toLowerCase(),
                currency: order.currency || "INR",
                status: "PENDING",
            });

            return res.status(201).json({
                success: true,
                order,
                key: process.env.RAZORPAY_KEY_ID,
            });
        } catch (err) {
            console.log("Razorpay createOrder error:", err);
            return next(new ErrorHandler(err.message + " | " + (err.description || ""), 500));
        }
    });
};

export const verifyAndRegister = (EventModel, eventKey) => {
    return CatchAsyncErrror(async (req, res, next) => {
        try {
            const userId = req.user._id;
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                registrationData,
            } = req.body;


            const body = `${razorpay_order_id}|${razorpay_payment_id}`;
            const expected = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body)
                .digest("hex");

            if (expected !== razorpay_signature) {
                return next(new ErrorHandler("Payment verification failed", 400));
            }


            const txn = await Transaction.findOne({
                userId,
                orderId: razorpay_order_id,
                status: "PENDING",
            });

            if (!txn) {
                return next(new ErrorHandler("No pending transaction found", 404));
            }
            const payment = await razorpay.payments.fetch(razorpay_payment_id);

            const registration = await EventModel.create({
              ...registrationData,
              userId,
              category: registrationData?.category || txn.category || "open",
              registrationFee: txn.amount / 100,
              paymentOrderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              paymentSignature: razorpay_signature,
              paymentStatus: "paid",
              status: "confirmed",
              transaction: txn._id,
            });

            txn.paymentId = razorpay_payment_id;
            txn.signature = razorpay_signature;
            txn.status = "SUCCESS";
            txn.registrationId = registration._id;

            txn.registrationFee = txn.amount / 100;
            txn.method = payment.method;
            txn.upiVpa = payment.upi?.vpa || null;
            txn.upiTransactionId =
              payment.acquirer_data?.upi_transaction_id || payment.acquirer_data?.rrn || null;
            txn.wallet = payment.wallet || null;
            txn.card = payment.card
              ? {
                  last4: payment.card.last4,
                  network: payment.card.network,
                  issuer: payment.card.issuer,
                  type: payment.card.type,
                }
              : null;
            
            await txn.save();

            await User.findByIdAndUpdate(userId, {
                $push: {
                    eventRegistrations: {
                        event: toEventKey(eventKey),
                        registrationId: registration._id,
                        status: "success",
                    },
                },
                $inc: { totalEventRegistrations: 1 },
            });
            const user = await User.findById(userId).select("email fullname");

            const enrichedData = {
                ...registrationData,
                fullname:user?.fullname || user.username,
                email: user?.email,
                amount:(txn.amount || 0)
            };

            await sendEventRegistrationEmail(
                enrichedData,
                eventKey,
                razorpay_payment_id,
                razorpay_order_id,
                txn
            );

            return res.status(200).json({
                success: true,
                message: `Payment verified & registration completed for ${toEventKey(eventKey)}`,
                registration,
            });
        } catch (err) {
            console.log(err)
            return next(new ErrorHandler(err.message, 500));
        }
    });
};



// Get Registrations for a specific event
export const getEventRegistrations = (eventKey) => {
    return CatchAsyncErrror(async (req, res, next) => {
        const key = String(eventKey).toLowerCase().replace(/\s+/g, "_");
        const EventModel = EVENT_MODELS[key];

        if (!EventModel) return next(new ErrorHandler("Invalid event", 400));

        const { page = 1, limit = 10, status, college } = req.query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (college) filter.collegeName = { $regex: college, $options: "i" };

        // Fetch registrations with pagination
        const registrations = await EventModel.find(filter)
            .populate("userId", "username email fullname")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalRegistrations = await EventModel.countDocuments(filter);

        res.status(200).json({
            success: true,
            event: key,
            registrations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRegistrations / limit),
                totalRegistrations,
                hasNext: page < Math.ceil(totalRegistrations / limit),
                hasPrev: page > 1,
            },
        });
    });
};



export const getMyRegistrations = CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user._id;
    const results = {};

    for (const [key, Model] of Object.entries(EVENT_MODELS)) {
        const registrations = await Model.find({ userId }).sort({ createdAt: -1 });
        if (registrations.length) results[key] = registrations;
    }

    res.status(200).json({
        success: true,
        registrations: results,
    });
});

export const getAllRegistrations = CatchAsyncErrror(async (req, res, next) => {
    const results = {};

    for (const [key, Model] of Object.entries(EVENT_MODELS)) {
        const registrations = await Model.find().populate("userId", "username email fullname").sort({ createdAt: -1 });
        if (registrations.length) results[key] = registrations;
    }

    res.status(200).json({
        success: true,
        registrations: results,
    });
});



export const getRegisteredEvents = CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("eventRegistrations");

    if (!user) return next(new ErrorHandler("User not found", 404));

    return res.status(200).json({
        success: true,
        events: user.eventRegistrations.map(reg => ({
            event: reg.event,
            registrationId: reg.registrationId,
            status: reg.status,
            registrationDate: reg.registrationDate
        }))
    });
});