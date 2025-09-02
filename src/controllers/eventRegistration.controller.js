import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { createOrder } from "./payment.controller.js";
import crypto from "crypto";
import ErrorHandler from "../utils/ErrorHandler.js";
import {EVENT_MODELS} from "../models/eventRegistration.model.js";

// fees in rs
const EVENT_FEES = {
    athletics: 200,
    badminton: 300,
    basketball: 500,
    chess: 150,
    cricket: 600,
    football: 600,
    kabaddi: 400,
    lawn_tennis: 300,
    squash: 200,
    table_tennis: 250,
    volleyball: 400,
    weight_lifting: 200,
    power_lifting: 200,
    codm: 200,
    bgmi: 200,
    valorant: 200,
    freefire: 200,
    clash_royale:210
  };
  

function getEventFee(eventKey ) {
    const fee = EVENT_FEES[eventKey];
    if (!fee) throw new Error("Fee not configured for event");
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

            const amount = getEventFee(eventKey);
            const receipt = `${eventKey}_${userId.toString().slice(-10)}_${Date.now().toString().slice(-6)}`;
            const order = await createOrder(amount, receipt);

            await Transaction.create({
                userId,
                event: toEventKey(eventKey),
                orderId: order.id,
                amount,
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

            console.log(registrationData)

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

            const registration = await EventModel.create({
                ...registrationData,
                userId,
                registrationFee: (txn.amount || 0) / 100, 
                paymentOrderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                paymentSignature: razorpay_signature,
                paymentStatus: "paid", 
                status: "confirmed",
                transaction: txn._id

            });

            console.log("DFVF ", userId)
            txn.paymentId = razorpay_payment_id;
            txn.signature = razorpay_signature;
            txn.status = "SUCCESS";
            txn.registrationId = registration._id;
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
        console.log("hello")
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