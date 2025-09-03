import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { Accommodation } from "../models/accommodation.model.js";
import { createOrder } from "./payment.controller.js";
import crypto from "crypto";
import ErrorHandler from "../utils/ErrorHandler.js";


const ACCOMMODATION_RATE_PER_DAY = 250; 
const MEALS_RATE_PER_DAY = 180; 


const calculateAccommodationCost = (days, optForMeals) => {
    const accommodationFee = days * ACCOMMODATION_RATE_PER_DAY;
    const mealsFee = optForMeals ? days * MEALS_RATE_PER_DAY : 0;
    const totalAmount = accommodationFee + mealsFee;
    
    return {
        accommodationFee,
        mealsFee,
        totalAmount
    };
};


export const createAccommodationOrder = CatchAsyncErrror(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { 
            fullName, 
            address, 
            phoneNumber, 
            adhaar, 
            accommodationDays, 
            optForMeals 
        } = req.body;


        if (!fullName || !address || !phoneNumber || !adhaar || !accommodationDays) {
            return next(new ErrorHandler("All fields are required", 400));
        }


        const existingAccommodation = await Accommodation.findOne({ userId });
        if (existingAccommodation) {
            return res.status(400).json({
                success: false,
                message: "You already have an accommodation booking",
                accommodation: existingAccommodation
            });
        }


        const { accommodationFee, mealsFee, totalAmount } = calculateAccommodationCost(
            accommodationDays, 
            optForMeals || false
        );


        const receipt = `accommodation_${userId.toString().slice(-10)}_${Date.now().toString().slice(-6)}`;
        

        const order = await createOrder(totalAmount, receipt);


        await Transaction.create({
            userId,
            event: "accommodation",
            orderId: order.id,
            amount: totalAmount,
            currency: order.currency || "INR",
            status: "PENDING",
        });

        return res.status(201).json({
            success: true,
            message: "Accommodation order created successfully",
            order,
            key: process.env.RAZORPAY_KEY_ID,
            accommodationDetails: {
                accommodationDays,
                optForMeals: optForMeals || false,
                accommodationFee,
                mealsFee,
                totalAmount
            }
        });

    } catch (err) {
        console.log("Accommodation order creation error:", err);
        return next(new ErrorHandler(err.message + " | " + (err.description || ""), 500));
    }
});


export const verifyAccommodationPayment = CatchAsyncErrror(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            accommodationData
        } = req.body;

        // Verify payment signature
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


        const user = await User.findById(userId).select("username email");
        

        const { accommodationFee, mealsFee, totalAmount } = calculateAccommodationCost(
            accommodationData.accommodationDays,
            accommodationData.optForMeals || false
        );


        const accommodation = await Accommodation.create({
            userId,
            username: user.username,
            email: user.email,
            fullName: accommodationData.fullName,
            address: accommodationData.address,
            phoneNumber: accommodationData.phoneNumber,
            adhaar: accommodationData.adhaar,
            accommodationDays: accommodationData.accommodationDays,
            optForMeals: accommodationData.optForMeals || false,
            totalAmount,
            accommodationFee,
            mealsFee,
            paymentOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            paymentSignature: razorpay_signature,
            paymentStatus: "paid",
            status: "confirmed",
            transaction: txn._id
        });


        txn.paymentId = razorpay_payment_id;
        txn.signature = razorpay_signature;
        txn.status = "SUCCESS";
        txn.registrationId = accommodation._id;
        await txn.save();

        return res.status(200).json({
            success: true,
            message: "Payment verified and accommodation booked successfully",
            accommodation
        });

    } catch (err) {
        console.log("Accommodation payment verification error:", err);
        return next(new ErrorHandler(err.message, 500));
    }
});


export const getMyAccommodation = CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user._id;
    
    const accommodation = await Accommodation.findOne({ userId })
        .populate("transaction", "orderId paymentId status");

    if (!accommodation) {
        return res.status(404).json({
            success: false,
            message: "No accommodation booking found"
        });
    }

    return res.status(200).json({
        success: true,
        accommodation
    });
});


export const getAllAccommodations = CatchAsyncErrror(async (req, res, next) => {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;


    const filter = {};
    if (status) filter.status = status;


    const accommodations = await Accommodation.find(filter)
        .populate("userId", "username email fullname")
        .populate("transaction", "orderId paymentId status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const totalAccommodations = await Accommodation.countDocuments(filter);

    res.status(200).json({
        success: true,
        accommodations,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalAccommodations / limit),
            totalAccommodations,
            hasNext: page < Math.ceil(totalAccommodations / limit),
            hasPrev: page > 1,
        },
    });
});


export const getAccommodationPricing = CatchAsyncErrror(async (req, res, next) => {
    return res.status(200).json({
        success: true,
        pricing: {
            accommodationRate: ACCOMMODATION_RATE_PER_DAY,
            mealsRate: MEALS_RATE_PER_DAY,
            currency: "INR",
            description: {
                accommodation: `₹${ACCOMMODATION_RATE_PER_DAY} per day per person`,
                meals: `₹${MEALS_RATE_PER_DAY} per day per person (optional)`
            }
        }
    });
});