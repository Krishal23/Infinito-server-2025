import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { verifyPayment, createOrder } from "./payment.controller.js";
import crypto from "crypto";

import ErrorHandler from "../utils/ErrorHandler.js";
import {
    // AthleticsRegistration,
    // BadmintonRegistration,
    // BasketballRegistration,
    // ChessRegistration,
    // CricketRegistration,
    // FootballRegistration,
    // KabaddiRegistration,
    // LawnTennisRegistration,
    // SquashRegistration,
    // TableTennisRegistration,
    // VolleyballRegistration,
    // WeightLiftingRegistration,
    // CODMRegistration,
    EVENT_MODELS
} from "../models/eventRegistration.model.js";



// fees in rs
const EVENT_FEES = {
    weight_lifting: 200,
    squash:200, 
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
            console.log(eventKey)

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
            console.error("Razorpay createOrder error:", err);
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
            });

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
            return next(new ErrorHandler(err.message, 500));
        }
    });
};
















// // Generic registration function for all events

// const createEventRegistration = (EventModel, eventName) => {
//     return CatchAsyncErrror(async (req, res, next) => {
//         try {
//             const userId = req.user?._id;
//             const user = req.user;

//             // Collect registration data but DON'T save it yet
//             const registrationData = {
//                 ...req.body,
//                 userId,
//                 username: user?.username || req.body.username,
//                 email: user?.email || req.body.email,
//                 fullname: user?.fullname || req.body.fullname || req.body.name,
//                 collegeName: user?.collegeName || req.body.collegeName,
//                 rollNo: user?.rollNo || req.body.rollNo,
//                 phoneNumber: req.body.phoneNumber,
//             };

//             // defaults (example: football)
//             const e = eventName.toLowerCase();
//             if (e === "football") {
//                 registrationData.category ||= (req.body.team === "women" ? "women" : "men");
//                 registrationData.position ||= "any";
//                 registrationData.preferredFoot ||= "right";
//                 registrationData.teamPreference ||= "create_new";
//                 registrationData.jerseySize ||= "M";
//                 registrationData.shoeSize ||= "9";
//                 registrationData.experience ||= "beginner";
//             }

//             if (registrationData.team && typeof registrationData.team === "object") {
//                 const team = registrationData.team;
//                 team.leaderId = userId;
//                 if (Array.isArray(team.members)) {
//                     team.teamSize = team.members.length;
//                 }
//                 registrationData.team = team;
//             }

//             // ✅ Create Razorpay Order (no DB write yet)
//             const order = await createOrder(1, `${eventName}_${Date.now()}`); // change 1 to real amount

//             res.status(201).json({
//                 success: true,
//                 message: `Order created for ${eventName}. Complete payment to finish registration.`,
//                 order,
//                 key: process.env.RAZORPAY_KEY_ID,
//                 registrationData // send back so frontend can resend after payment
//             });

//         } catch (error) {
//             if (error.code === 11000) {
//                 return next(new ErrorHandler(`You are already registered for ${eventName}`, 400));
//             }
//             return next(new ErrorHandler(error.message, 500));
//         }
//     });
// };





// export const verifyEventPayment = async (req, res) => {
//     try {
//         const {
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature,
//             event,
//             registrationData, // frontend must send back the same data from initiate
//         } = req.body;

//         // Step 1: Generate signature using order_id + payment_id
//         const sign = razorpay_order_id + "|" + razorpay_payment_id;
//         const expectedSign = crypto
//             .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//             .update(sign.toString())
//             .digest("hex");

//         if (expectedSign !== razorpay_signature) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Payment verification failed. Signature mismatch.",
//             });
//         }

//         // Step 2: Save Registration only now
//         const registration = await EventModel.create({
//             ...registrationData,
//             paymentStatus: "paid",
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature,
//         });

//         // Step 3: Save transaction as success
//         await Transaction.create({
//             userId: registrationData.userId,
//             event: event.toLowerCase(),
//             registrationId: registration._id,
//             orderId: razorpay_order_id,
//             paymentId: razorpay_payment_id,
//             amount: registrationData.amount || 1,
//             currency: "INR",
//             status: "SUCCESS"
//         });

//         // Step 4: Update User profile
//         await User.findByIdAndUpdate(registrationData.userId, {
//             $push: {
//                 eventRegistrations: {
//                     event: event.toLowerCase().replace(/ /g, "_"),
//                     registrationId: registration._id,
//                     status: "success"
//                 }
//             },
//             $inc: { totalEventRegistrations: 1 }
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Payment verified & registration completed",
//             registration,
//         });
//     } catch (err) {
//         console.error("Error verifying payment:", err);
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//         });
//     }
// };






// // Generic function to get user's registration for an event
// const getUserEventRegistration = (EventModel, eventName) => {
//     return CatchAsyncErrror(async (req, res, next) => {
//         try {
//             const userId = req.user._id;

//             const registration = await EventModel.findOne({ userId });

//             if (!registration) {
//                 return res.status(404).json({
//                     success: false,
//                     message: `No registration found for ${eventName}`
//                 });
//             }

//             res.status(200).json({
//                 success: true,
//                 registration
//             });

//         } catch (error) {
//             return next(new ErrorHandler(error.message, 500));
//         }
//     });
// };

// // Generic function to update registration status (Admin/Moderator only)
// const updateRegistrationStatus = (EventModel, eventName) => {
//     return CatchAsyncErrror(async (req, res, next) => {
//         try {
//             const { registrationId } = req.params;
//             const { status, paymentStatus } = req.body;

//             const registration = await EventModel.findById(registrationId);
//             if (!registration) {
//                 return next(new ErrorHandler(`${eventName} registration not found`, 404));
//             }

//             const updateData = {};
//             if (status) updateData.status = status;
//             if (paymentStatus) updateData.paymentStatus = paymentStatus;

//             const updatedRegistration = await EventModel.findByIdAndUpdate(
//                 registrationId,
//                 updateData,
//                 { new: true }
//             );

//             // Update user's event registration status
//             if (status) {
//                 await User.findByIdAndUpdate(registration.userId, {
//                     $set: { "eventRegistrations.$[elem].status": status }
//                 }, {
//                     arrayFilters: [{ "elem.registrationId": registrationId }]
//                 });
//             }

//             res.status(200).json({
//                 success: true,
//                 message: `${eventName} registration updated successfully`,
//                 registration: updatedRegistration
//             });

//         } catch (error) {
//             return next(new ErrorHandler(error.message, 500));
//         }
//     });
// };

// // Generic function to get all registrations for an event (Admin/Moderator only)
// const getAllEventRegistrations = (EventModel, eventName) => {
//     return CatchAsyncErrror(async (req, res, next) => {
//         try {
//             const { page = 1, limit = 10, status, college } = req.query;
//             const skip = (page - 1) * limit;

//             // Build filter object
//             const filter = {};
//             if (status) filter.status = status;
//             if (college) filter.collegeName = { $regex: college, $options: 'i' };

//             const registrations = await EventModel
//                 .find(filter)
//                 .populate('userId', 'username email isIITPStud score')
//                 .sort({ registrationDate: -1 })
//                 .skip(skip)
//                 .limit(parseInt(limit));

//             const totalRegistrations = await EventModel.countDocuments(filter);

//             res.status(200).json({
//                 success: true,
//                 registrations,
//                 pagination: {
//                     currentPage: parseInt(page),
//                     totalPages: Math.ceil(totalRegistrations / limit),
//                     totalRegistrations,
//                     hasNext: page < Math.ceil(totalRegistrations / limit),
//                     hasPrev: page > 1
//                 }
//             });

//         } catch (error) {
//             return next(new ErrorHandler(error.message, 500));
//         }
//     });
// };

// // Generic function to cancel registration
// const cancelEventRegistration = (EventModel, eventName) => {
//     return CatchAsyncErrror(async (req, res, next) => {
//         try {
//             const userId = req.user._id;

//             const registration = await EventModel.findOne({ userId });
//             if (!registration) {
//                 return next(new ErrorHandler(`No ${eventName} registration found`, 404));
//             }

//             if (registration.status === 'cancelled') {
//                 return next(new ErrorHandler(`${eventName} registration is already cancelled`, 400));
//             }

//             // Update registration status
//             registration.status = 'cancelled';
//             await registration.save();

//             // Update user's event registration status
//             await User.findByIdAndUpdate(userId, {
//                 $set: { "eventRegistrations.$[elem].status": "cancelled" }
//             }, {
//                 arrayFilters: [{ "elem.registrationId": registration._id }]
//             });

//             res.status(200).json({
//                 success: true,
//                 message: `${eventName} registration cancelled successfully`
//             });

//         } catch (error) {
//             return next(new ErrorHandler(error.message, 500));
//         }
//     });
// };

// // Athletics Controllers
// export const registerForAthletics = createEventRegistration(AthleticsRegistration, "Athletics");
// export const getMyAthleticsRegistration = getUserEventRegistration(AthleticsRegistration, "Athletics");
// export const getAllAthleticsRegistrations = getAllEventRegistrations(AthleticsRegistration, "Athletics");
// export const updateAthleticsRegistrationStatus = updateRegistrationStatus(AthleticsRegistration, "Athletics");
// export const cancelAthleticsRegistration = cancelEventRegistration(AthleticsRegistration, "Athletics");

// // Badminton Controllers
// export const registerForBadminton = createEventRegistration(BadmintonRegistration, "Badminton");
// export const getMyBadmintonRegistration = getUserEventRegistration(BadmintonRegistration, "Badminton");
// export const getAllBadmintonRegistrations = getAllEventRegistrations(BadmintonRegistration, "Badminton");
// export const updateBadmintonRegistrationStatus = updateRegistrationStatus(BadmintonRegistration, "Badminton");
// export const cancelBadmintonRegistration = cancelEventRegistration(BadmintonRegistration, "Badminton");

// // Basketball Controllers
// export const registerForBasketball = createEventRegistration(BasketballRegistration, "Basketball");
// export const getMyBasketballRegistration = getUserEventRegistration(BasketballRegistration, "Basketball");
// export const getAllBasketballRegistrations = getAllEventRegistrations(BasketballRegistration, "Basketball");
// export const updateBasketballRegistrationStatus = updateRegistrationStatus(BasketballRegistration, "Basketball");
// export const cancelBasketballRegistration = cancelEventRegistration(BasketballRegistration, "Basketball");

// // Chess Controllers
// export const registerForChess = createEventRegistration(ChessRegistration, "Chess");
// export const getMyChessRegistration = getUserEventRegistration(ChessRegistration, "Chess");
// export const getAllChessRegistrations = getAllEventRegistrations(ChessRegistration, "Chess");
// export const updateChessRegistrationStatus = updateRegistrationStatus(ChessRegistration, "Chess");
// export const cancelChessRegistration = cancelEventRegistration(ChessRegistration, "Chess");

// // Cricket Controllers
// export const registerForCricket = createEventRegistration(CricketRegistration, "Cricket");
// export const getMyCricketRegistration = getUserEventRegistration(CricketRegistration, "Cricket");
// export const getAllCricketRegistrations = getAllEventRegistrations(CricketRegistration, "Cricket");
// export const updateCricketRegistrationStatus = updateRegistrationStatus(CricketRegistration, "Cricket");
// export const cancelCricketRegistration = cancelEventRegistration(CricketRegistration, "Cricket");

// // Football Controllers
// export const registerForFootball = createEventRegistration(FootballRegistration, "Football");
// export const getMyFootballRegistration = getUserEventRegistration(FootballRegistration, "Football");
// export const getAllFootballRegistrations = getAllEventRegistrations(FootballRegistration, "Football");
// export const updateFootballRegistrationStatus = updateRegistrationStatus(FootballRegistration, "Football");
// export const cancelFootballRegistration = cancelEventRegistration(FootballRegistration, "Football");

// // Kabaddi Controllers
// export const registerForKabaddi = createEventRegistration(KabaddiRegistration, "Kabaddi");
// export const getMyKabaddiRegistration = getUserEventRegistration(KabaddiRegistration, "Kabaddi");
// export const getAllKabaddiRegistrations = getAllEventRegistrations(KabaddiRegistration, "Kabaddi");
// export const updateKabaddiRegistrationStatus = updateRegistrationStatus(KabaddiRegistration, "Kabaddi");
// export const cancelKabaddiRegistration = cancelEventRegistration(KabaddiRegistration, "Kabaddi");

// // Lawn Tennis Controllers
// export const registerForLawnTennis = createEventRegistration(LawnTennisRegistration, "Lawn Tennis");
// export const getMyLawnTennisRegistration = getUserEventRegistration(LawnTennisRegistration, "Lawn Tennis");
// export const getAllLawnTennisRegistrations = getAllEventRegistrations(LawnTennisRegistration, "Lawn Tennis");
// export const updateLawnTennisRegistrationStatus = updateRegistrationStatus(LawnTennisRegistration, "Lawn Tennis");
// export const cancelLawnTennisRegistration = cancelEventRegistration(LawnTennisRegistration, "Lawn Tennis");

// // Squash Controllers
// export const registerForSquash = createEventRegistration(SquashRegistration, "Squash");
// export const getMySquashRegistration = getUserEventRegistration(SquashRegistration, "Squash");
// export const getAllSquashRegistrations = getAllEventRegistrations(SquashRegistration, "Squash");
// export const updateSquashRegistrationStatus = updateRegistrationStatus(SquashRegistration, "Squash");
// export const cancelSquashRegistration = cancelEventRegistration(SquashRegistration, "Squash");

// // Table Tennis Controllers
// export const registerForTableTennis = createEventRegistration(TableTennisRegistration, "Table Tennis");
// export const getMyTableTennisRegistration = getUserEventRegistration(TableTennisRegistration, "Table Tennis");
// export const getAllTableTennisRegistrations = getAllEventRegistrations(TableTennisRegistration, "Table Tennis");
// export const updateTableTennisRegistrationStatus = updateRegistrationStatus(TableTennisRegistration, "Table Tennis");
// export const cancelTableTennisRegistration = cancelEventRegistration(TableTennisRegistration, "Table Tennis");

// // Volleyball Controllers
// export const registerForVolleyball = createEventRegistration(VolleyballRegistration, "Volleyball");
// export const getMyVolleyballRegistration = getUserEventRegistration(VolleyballRegistration, "Volleyball");
// export const getAllVolleyballRegistrations = getAllEventRegistrations(VolleyballRegistration, "Volleyball");
// export const updateVolleyballRegistrationStatus = updateRegistrationStatus(VolleyballRegistration, "Volleyball");
// export const cancelVolleyballRegistration = cancelEventRegistration(VolleyballRegistration, "Volleyball");

// // Weight Lifting Controllers
// export const registerForWeightLifting = createEventRegistration(WeightLiftingRegistration, "Weight Lifting");
// export const getMyWeightLiftingRegistration = getUserEventRegistration(WeightLiftingRegistration, "Weight Lifting");
// export const getAllWeightLiftingRegistrations = getAllEventRegistrations(WeightLiftingRegistration, "Weight Lifting");
// export const updateWeightLiftingRegistrationStatus = updateRegistrationStatus(WeightLiftingRegistration, "Weight Lifting");
// export const cancelWeightLiftingRegistration = cancelEventRegistration(WeightLiftingRegistration, "Weight Lifting");



// //CODM Controllers
// export const registerForCODM = createEventRegistration(CODMRegistration, "CODM");
// export const getMyCODMRegistration = getUserEventRegistration(CODMRegistration, "CODM");
// export const getAllCODMRegistrations = getAllEventRegistrations(CODMRegistration, "CODM");
// export const updateCODMRegistrationStatus = updateRegistrationStatus(CODMRegistration, "CODM");
// export const cancelCODMRegistration = cancelEventRegistration(CODMRegistration, "CODM");





// // Utility function to get user's all event registrations
// export const getMyAllEventRegistrations = CatchAsyncErrror(async (req, res, next) => {
//     try {
//         const userId = req.user._id;

//         const user = await User.findById(userId)
//             .populate('eventRegistrations.registrationId')
//             .select('eventRegistrations');

//         if (!user) {
//             return next(new ErrorHandler("User not found", 404));
//         }

//         const registrations = [];

//         for (const eventReg of user.eventRegistrations) {
//             const eventModel = EVENT_MODELS[eventReg.event];
//             if (eventModel) {
//                 const registration = await eventModel.findById(eventReg.registrationId);
//                 if (registration) {
//                     registrations.push({
//                         event: eventReg.event,
//                         status: eventReg.status,
//                         registrationDate: eventReg.registrationDate,
//                         details: registration
//                     });
//                 }
//             }
//         }

//         res.status(200).json({
//             success: true,
//             registrations,
//             totalRegistrations: registrations.length
//         });

//     } catch (error) {
//         return next(new ErrorHandler(error.message, 500));
//     }
// });

// // Admin function to get event registration statistics
// export const getEventRegistrationStats = CatchAsyncErrror(async (req, res, next) => {
//     try {
//         const stats = {};

//         for (const [eventName, EventModel] of Object.entries(EVENT_MODELS)) {
//             const totalRegistrations = await EventModel.countDocuments();
//             const confirmedRegistrations = await EventModel.countDocuments({ status: 'confirmed' });
//             const pendingRegistrations = await EventModel.countDocuments({ status: 'pending' });
//             const cancelledRegistrations = await EventModel.countDocuments({ status: 'cancelled' });
//             const paidRegistrations = await EventModel.countDocuments({ paymentStatus: 'paid' });

//             stats[eventName] = {
//                 total: totalRegistrations,
//                 confirmed: confirmedRegistrations,
//                 pending: pendingRegistrations,
//                 cancelled: cancelledRegistrations,
//                 paid: paidRegistrations,
//                 unpaid: totalRegistrations - paidRegistrations
//             };
//         }

//         // Overall statistics
//         const overallStats = {
//             totalEvents: Object.keys(EVENT_MODELS).length,
//             totalRegistrations: Object.values(stats).reduce((sum, event) => sum + event.total, 0),
//             totalConfirmed: Object.values(stats).reduce((sum, event) => sum + event.confirmed, 0),
//             totalPending: Object.values(stats).reduce((sum, event) => sum + event.pending, 0),
//             totalCancelled: Object.values(stats).reduce((sum, event) => sum + event.cancelled, 0)
//         };

//         res.status(200).json({
//             success: true,
//             eventStats: stats,
//             overallStats
//         });

//     } catch (error) {
//         return next(new ErrorHandler(error.message, 500));
//     }
// });
