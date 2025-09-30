import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import { Transaction } from "../models/transaction.model.js";
import { createOrder } from "./payment.controller.js";
import crypto from "crypto";
import ErrorHandler from "../utils/ErrorHandler.js";
import { EVENT_MODELS } from "../models/EventModelFinal.js";
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




export const registerWithProof = (EventModel, eventKey) => {
  return CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user._id;

    // proofString can come from uploaded file or request body
    const proofString = req.file?.path || req.body.proofString;
    if (!proofString) {
      return next(new ErrorHandler("Proof is required for registration", 400));
    }

    if (!req.body.registrationData) {
      return next(new ErrorHandler("Registration data is required", 400));
    }

    const parsedData = typeof req.body.registrationData === "string"
      ? JSON.parse(req.body.registrationData)
      : req.body.registrationData;

    console.log(parsedData)

    // ---------------- Map registration data ----------------
    let mappedData = { userId };

    if (["badminton", "basketball", "chess", "cricket", "football", "kabaddi",
      "lawn_tennis", "squash", "table_tennis", "volleyball",
      "weight_lifting", "power_lifting"].includes(eventKey)) {

      mappedData = {
        userId,
        category: parsedData?.category || "open",
        collegeName: parsedData?.collegeName,
        collegeAddress: parsedData?.collegeAddress,
        captain: parsedData?.captain || undefined,
        viceCaptain: parsedData?.viceCaptain || undefined,
        players: parsedData?.players || [],
        substitutes: parsedData?.substitutes || [],
        coach: parsedData?.coachDetails || parsedData?.coach,
      };

    } else if (eventKey === "athletics") {
      mappedData = {
        userId,
        lead: {
          fullname: parsedData?.leadName,
          email: parsedData?.email,
          phoneNumber: parsedData?.phoneNumber,
          aadharId: parsedData?.aadharId
        },
        category: parsedData?.category || "men",
        coach: parsedData?.coachDetails,
        individualEvents: parsedData?.individualEvents || [],
        relayTeams: parsedData?.relayTeams || [],
        collegeName: parsedData?.collegeName,
        collegeAddress: parsedData?.collegeAddress,
      };

    } else if (["bgmi", "freefire", "codm", "valorant", "clash_royale"].includes(eventKey)) {
      mappedData = {
        userId,
        teamName: parsedData?.teamName,
        teamLeader: parsedData?.teamLeader,
        players: parsedData?.players || [],
        queries: parsedData?.queries || "",
        collegeName: parsedData?.collegeName,
        collegeAddress: parsedData?.collegeAddress,
      };
    }

    // ---------------- Add payment/proof info ----------------
    Object.assign(mappedData, {
      registrationFee: 0,
      proofString,
      paymentStatus: "paid",
      status: "confirmed",
    });

    console.log(mappedData)

    const registration = await EventModel.create(mappedData);

    // ---------------- Update User ----------------
    await User.findByIdAndUpdate(userId, {
      $push: {
        eventRegistrations: {
          event: eventKey,
          registrationId: registration._id,
          status: "success",
        },
      },
      $inc: { totalEventRegistrations: 1 },
    });

    return res.status(200).json({
      success: true,
      message: `Registration completed for ${eventKey}`,
      registration,
    });
  });
};



export const createEventOrder = (eventKey) => {
  return CatchAsyncErrror(async (req, res, next) => {
    try {
      const userId = req.user._id;

      // console.log(req.body)
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

      let amount;
      // console.log(eventKey)

      if (eventKey === 'chess') {
        // Chess-specific fee calculation
        const registrationData = req.body;

        // Total players = 1 (for the captain) + the number of players in the array
        const totalPlayers = 1 + (registrationData.players?.length || 0);

        // Fetch the per-player fee from your config
        const chessFeeConfig = EVENT_FEES.chess;
        if (!chessFeeConfig || typeof chessFeeConfig.men === 'undefined') {
          return next(new ErrorHandler("Chess per-player fee is not configured correctly.", 500));
        }
        const perPlayerFee = chessFeeConfig.men;

        // Calculate the final amount
        amount = totalPlayers * perPlayerFee;

      } else {
        // Existing logic for all other events
        const category = req?.body?.category || "open";
        amount = getEventFee(eventKey, category);
      }

      const category = req?.body?.category || "open";
      // const amount = getEventFee(eventKey, category);
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

      console.log(registrationData, "registration data")

      // Verify Razorpay signature
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expected !== razorpay_signature) {
        return next(new ErrorHandler("Payment verification failed", 400));
      }

      // Ensure txn exists
      const txn = await Transaction.findOne({
        userId,
        orderId: razorpay_order_id,
        status: "PENDING",
      });
      if (!txn) return next(new ErrorHandler("No pending transaction found", 404));

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      // ---------------- Mapping Registration Data ----------------
      let mappedData = { userId };

      if (["badminton", "basketball", "chess", "cricket", "football", "kabaddi",
        "lawn_tennis", "squash", "table_tennis", "volleyball",
        "weight_lifting", "power_lifting"].includes(eventKey)) {
        mappedData = {
          userId,
          category: registrationData?.category || txn.category || "open",
          collegeName: registrationData?.collegeName,
          collegeAddress: registrationData?.collegeAddress,
          captain: registrationData?.captain,
          viceCaptain: registrationData?.viceCaptain,
          players: registrationData?.players || [],
          substitutes: registrationData?.substitutes || [],
          coach: registrationData?.coachDetails || registrationData?.coach,
        };
      }
      else if (eventKey === "athletics") {
        mappedData = {
          userId,
          lead: {
            fullname: registrationData?.leadName,
            email: registrationData?.email,
            phoneNumber: registrationData?.phoneNumber,
            aadharId: registrationData?.aadharId
          },
          category: registrationData?.category || txn.category || "men",
          coach: registrationData?.coachDetails,
          individualEvents: registrationData?.individualEvents || [],
          relayTeams: registrationData?.relayTeams || [],
        };
      }
      else if (["bgmi", "freefire", "codm", "valorant", "clash_royale"].includes(eventKey)) {
        mappedData = {
          userId,
          teamName: registrationData?.teamName,
          teamLeader: registrationData?.teamLeader,
          players: registrationData?.players || [],
          queries: registrationData?.queries || "",
        };
      }

      // Add payment info
      Object.assign(mappedData, {
        registrationFee: txn.amount / 100,
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        paymentSignature: razorpay_signature,
        paymentStatus: "paid",
        status: "confirmed",
        transaction: txn._id,
      });

      const registration = await EventModel.create(mappedData);
      console.log(registration, "new registration")

      // ---------------- Update Transaction ----------------
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

      // ---------------- Update User ----------------
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

      // Send confirmation mail
      const user = await User.findById(userId).select("email fullname");
      const enrichedData = {
        ...mappedData,
        fullname: user?.fullname || user.username,
        email: user?.email,
        amount: (txn.amount || 0),
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
      console.log(err);
      return next(new ErrorHandler(err.message, 500));
    }
  });
};


export const fetchEventRegistrations = async (req, res, next) => {
  try {
    const { eventKey } = req.params; // e.g., /api/events/:eventKey
    const isAdmin = req.user?.role === "admin";

    const key = String(eventKey).toLowerCase().replace(/\s+/g, "_");
    const EventModel = EVENT_MODELS[key];
    if (!EventModel) return next(new ErrorHandler("Invalid event", 400));

    const { page = 1, limit = 10, status, college } = req.query;
    const skip = (page - 1) * limit;

    let registrations = [];
    let totalRegistrations = 0;

    if (isAdmin) {
      // --- Admin: Fetch all registrations with filters & pagination ---
      const filter = {};
      if (status) filter.paymentStatus = status;
      if (college) filter.collegeName = { $regex: college, $options: "i" };

      registrations = await EventModel.find(filter)
        .populate("userId", "username email fullname")
        .populate("transaction")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      totalRegistrations = await EventModel.countDocuments(filter);
    } else {
      // --- User: Fetch only their registrations ---
      const userId = req.user._id;
      if (!userId) return res.status(400).json({ success: false, message: "User ID required" });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      for (const regInfo of user.eventRegistrations) {
        if (regInfo.event !== key) continue;

        const reg = await EventModel.findById(regInfo.registrationId)
          .populate("transaction")
          .lean();
        if (!reg) continue;

        registrations.push(reg);
      }
      totalRegistrations = registrations.length;
    }

    // --- Transform registrations to consistent format ---
    const formattedData = registrations.map((reg) => {
      const eventData = {
        eventName: key,
        eventId: reg._id,
        category: reg.category || null,
        collegeName: reg.collegeName || null,
        collegeAddress: reg.collegeAddress || null,
        registrationDate: reg.registrationDate || reg.createdAt,
        payment: {
          status: reg.paymentStatus || "pending",
          orderId: reg.paymentOrderId || null,
          paymentId: reg.paymentId || null,
          signature: reg.paymentSignature || null,
          transaction: reg.transaction || null,
        },
        players: [],
        fullReceipt: reg,
      };

      const addMember = (member, role = "player") => {
        if (!member) return;
        const name = member.fullname || member.leadName || member.name;
        if (!name) return;
        eventData.players.push({
          role,
          name,
          email: member.email || null,
          phoneNumber: member.phoneNumber || member.contactNumber || null,
          aadharId: member.aadharId || null,
        });
      };

      if (reg.captain) addMember(reg.captain, "captain");
      if (reg.viceCaptain) addMember(reg.viceCaptain, "viceCaptain");
      if (reg.lead) addMember(reg.lead, "lead");
      if (reg.teamLeader) addMember(reg.teamLeader, "teamLeader");
      if (reg.partnerDetails) addMember(reg.partnerDetails, "partner");

      if (Array.isArray(reg.players)) reg.players.forEach(p => addMember(p, "player"));
      else if (typeof reg.players === "object") addMember(reg.players, "player");

      if (Array.isArray(reg.substitutes)) reg.substitutes.forEach(s => addMember(s, "substitute"));
      if (reg.coach) addMember(reg.coach, "coach");

      if (Array.isArray(reg.relayTeams)) {
        reg.relayTeams.forEach((team, idx) => {
          if (Array.isArray(team.members)) team.members.forEach(m => addMember(m, `relayTeam_${idx + 1}`));
        });
      }

      if (Array.isArray(reg.individualEvents) && reg.individualEvents.length > 0) {
        eventData.individualEvents = reg.individualEvents;
      }

      return eventData;
    });

    return res.json({
      success: true,
      event: key,
      registrations: formattedData,
      pagination: isAdmin
        ? {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRegistrations / limit),
          totalRegistrations,
          hasNext: page < Math.ceil(totalRegistrations / limit),
          hasPrev: page > 1,
        }
        : undefined,
    });
  } catch (err) {
    console.error("Error fetching event registrations:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



export const getUserEventRegistrations = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const eventResults = [];

    for (const regInfo of user.eventRegistrations) {
      const { event: eventName, registrationId } = regInfo;
      const Model = EVENT_MODELS[eventName];
      if (!Model) continue;

      const reg = await Model.findById(registrationId)
        .populate("transaction")
        .lean();
      if (!reg) continue;

      const eventData = {
        eventName,
        eventId: reg._id,
        category: reg.category || null,
        collegeName: reg.collegeName || null,
        collegeAddress: reg.collegeAddress || null,
        registrationDate: reg.registrationDate || reg.createdAt,
        payment: {
          status: reg.paymentStatus || "pending",
          proof: reg.proofString || null,
          transaction: reg.transaction || null,
        },
        individualEvents: reg.individualEvents || [],
        relayTeams: reg.relayTeams || [],
        players: [],
        fullReceipt: reg,
      };

      // Helper to add person to players array
      const addPlayer = (person, role = "player") => {
        if (!person) return;
        const name = person.fullname || person.leadName || person.name;
        if (!name) return;
        eventData.players.push({
          role,
          name,
          email: person.email || null,
          phoneNumber: person.phoneNumber || person.contactNumber || null,
          aadharId: person.aadharId || null,
        });
      };

      // Add lead / captain / coach
      addPlayer(reg.lead, "lead");
      addPlayer(reg.captain, "captain");
      addPlayer(reg.viceCaptain, "viceCaptain");
      addPlayer(reg.coach, "coach");

      // Add substitutes
      if (Array.isArray(reg.substitutes)) {
        reg.substitutes.forEach((sub) => addPlayer(sub, "substitute"));
      }

      // Add general players (if schema has them)
      if (Array.isArray(reg.players)) {
        reg.players.forEach((p, idx) => addPlayer(p, `player_${idx + 1}`));
      }

      // Add relay team members
      if (Array.isArray(reg.relayTeams)) {
        reg.relayTeams.forEach((team, idx) => {
          if (Array.isArray(team.members)) {
            team.members.forEach((m) =>
              addPlayer(m, `relayTeam_${team.teamName || idx + 1}`)
            );
          }
        });
      }

      eventResults.push(eventData);
    }

    return res.json({ success: true, data: eventResults });
  } catch (err) {
    console.error("Error fetching user event registrations:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


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
      .populate("transaction") // populate transaction details
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




// export const getUserEventRegistrations = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     if (!userId) return res.status(400).json({ success: false, message: "User ID required" });

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const eventResults = [];

//     for (const regInfo of user.eventRegistrations) {
//       const { event: eventName, registrationId } = regInfo;
//       const Model = EVENT_MODELS[eventName];
//       if (!Model) continue;

//       const reg = await Model.findById(registrationId);
//       console.log(reg)
//       if (!reg) continue;

//       const eventData = {
//         eventName,
//         eventId: reg._id,
//         players: []
//       };

//       // --- Helper function to add a member to players array ---
//       const addMember = (member) => {
//         if (!member) return;
//         const name = member.fullname || member.leadName || member.name;
//         if (!name) return;
//         eventData.players.push({
//           name,
//           email: member.email || null,
//           phoneNumber: member.phoneNumber || member.contactNumber || null,
//           aadharId: member.aadharId || null,
//         });
//       };

//       // Add lead/captain
//       if (reg.lead) addMember(reg.lead);
//       if (reg.captain) addMember(reg.captain);
//       if (reg.viceCaptain) addMember(reg.viceCaptain);
//       if (reg.teamLeader) addMember(reg.teamLeader);
//       if (reg.partnerDetails) addMember(reg.partnerDetails);

//       // Add players
//       if (Array.isArray(reg.players)) {
//         reg.players.forEach(addMember);
//       } else if (typeof reg.players === "object") {
//         addMember(reg.players);
//       }

//       // Add substitutes if exist
//       if (Array.isArray(reg.substitutes)) {
//         reg.substitutes.forEach(addMember);
//       }

//       // Add coach
//       addMember(reg.coach);

//       // Add relay team members (for athletics)
//       if (Array.isArray(reg.relayTeams)) {
//         reg.relayTeams.forEach(team => {
//           if (Array.isArray(team.members)) {
//             team.members.forEach(addMember);
//           }
//         });
//       }

//       // Optional metadata
//       if (Array.isArray(reg.individualEvents) && reg.individualEvents.length > 0) {
//         eventData.individualEvents = reg.individualEvents;
//       }

//       eventResults.push(eventData);
//     }

//     return res.json({ success: true, data: eventResults });

//   } catch (err) {
//     console.error("Error fetching user event registrations:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };




// export const verifyAndRegister = (EventModel, eventKey) => {
//   return CatchAsyncErrror(async (req, res, next) => {
//     try {
//       const userId = req.user._id;
//       const {
//         razorpay_order_id,
//         razorpay_payment_id,
//         razorpay_signature,
//         registrationData,
//       } = req.body;


//       const body = `${razorpay_order_id}|${razorpay_payment_id}`;
//       const expected = crypto
//         .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//         .update(body)
//         .digest("hex");

//       if (expected !== razorpay_signature) {
//         return next(new ErrorHandler("Payment verification failed", 400));
//       }


//       const txn = await Transaction.findOne({
//         userId,
//         orderId: razorpay_order_id,
//         status: "PENDING",
//       });

//       if (!txn) {
//         return next(new ErrorHandler("No pending transaction found", 404));
//       }
//       const payment = await razorpay.payments.fetch(razorpay_payment_id);
//       // console.log(registrationData)

//       const registration = await EventModel.create({
//         ...registrationData,
//         coach: registrationData.coachDetails,
//         userId,
//         category: registrationData?.category || txn.category || "open",
//         registrationFee: txn.amount / 100,
//         paymentOrderId: razorpay_order_id,
//         paymentId: razorpay_payment_id,
//         paymentSignature: razorpay_signature,
//         paymentStatus: "paid",
//         status: "confirmed",
//         transaction: txn._id,

//       });

//       // console.log(registration, " ghjnkm")
//       txn.paymentId = razorpay_payment_id;
//       txn.signature = razorpay_signature;
//       txn.status = "SUCCESS";
//       txn.registrationId = registration._id;

//       txn.registrationFee = txn.amount / 100;
//       txn.method = payment.method;
//       txn.upiVpa = payment.upi?.vpa || null;
//       txn.upiTransactionId =
//         payment.acquirer_data?.upi_transaction_id || payment.acquirer_data?.rrn || null;
//       txn.wallet = payment.wallet || null;
//       txn.card = payment.card
//         ? {
//           last4: payment.card.last4,
//           network: payment.card.network,
//           issuer: payment.card.issuer,
//           type: payment.card.type,
//         }
//         : null;

//       await txn.save();

//       await User.findByIdAndUpdate(userId, {
//         $push: {
//           eventRegistrations: {
//             event: toEventKey(eventKey),
//             registrationId: registration._id,
//             status: "success",
//           },
//         },
//         $inc: { totalEventRegistrations: 1 },
//       });
//       const user = await User.findById(userId).select("email fullname");

//       const enrichedData = {
//         ...registrationData,
//         fullname: user?.fullname || user.username,
//         email: user?.email,
//         amount: (txn.amount || 0)
//       };

//       await sendEventRegistrationEmail(
//         enrichedData,
//         eventKey,
//         razorpay_payment_id,
//         razorpay_order_id,
//         txn
//       );

//       return res.status(200).json({
//         success: true,
//         message: `Payment verified & registration completed for ${toEventKey(eventKey)}`,
//         registration,
//       });
//     } catch (err) {
//       console.log(err)
//       return next(new ErrorHandler(err.message, 500));
//     }
//   });
// };



// Get Registrations for a specific event


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

  for (const [eventName, Model] of Object.entries(EVENT_MODELS)) {
    const registrations = await Model.find()
      .populate("userId", "username email fullname")
      .sort({ createdAt: -1 });

    if (!registrations.length) continue;

    results[eventName] = registrations.map((reg) => {
      const regData = {
        eventName,
        eventId: reg._id,
        user: reg.userId || null,
        category: reg.category || null,
        collegeName: reg.collegeName || null,
        collegeAddress: reg.collegeAddress || null,
        registrationDate: reg.registrationDate || reg.createdAt,
        players: [],
        coach:reg?.coach,
        raw: reg, // keep full object if you still want backend refs
      };

      // helper
      const addPlayer = (person, role = "player") => {
        if (!person) return;
        const name = person.fullname || person.leadName || person.name;
        if (!name) return;
        regData.players.push({
          role,
          name,
          email: person.email || null,
          phoneNumber: person.phoneNumber || person.contactNumber || null,
          aadharId: person.aadharId || null,
        });
      };

      // Add all roles
      addPlayer(reg.lead || { leadName: reg.leadName }, "lead");
      addPlayer(reg.captain, "captain");
      addPlayer(reg.viceCaptain, "viceCaptain");
      addPlayer(reg.coach, "coach");

      // Players array
      if (reg.players) {
        if (Array.isArray(reg.players)) {
          reg.players.forEach((p, idx) => addPlayer(p, `player_${idx + 1}`));
        } else if (typeof reg.players === "object") {
          addPlayer(reg.players, "player");
        }
      }

      // Substitutes
      if (Array.isArray(reg.substitutes)) {
        reg.substitutes.forEach((sub, idx) =>
          addPlayer(sub, `substitute_${idx + 1}`)
        );
      }

      // Team members
      if (reg.team && Array.isArray(reg.team.members)) {
        reg.team.members.forEach((m, idx) =>
          addPlayer(m, `teamMember_${idx + 1}`)
        );
      }

      // Partner
      addPlayer(reg.partnerDetails, "partner");

      // Relay teams
      if (Array.isArray(reg.relayTeams)) {
        reg.relayTeams.forEach((team, idx) => {
          if (Array.isArray(team.members)) {
            team.members.forEach((m) =>
              addPlayer(m, `relayTeam_${team.teamName || idx + 1}`)
            );
          }
        });
      }

      return regData;
    });
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







export const getAllEventPlayers = async (req, res) => {
  try {
    const results = [];
    console.log("Hello");

    for (const [eventName, Model] of Object.entries(EVENT_MODELS)) {
      const registrations = await Model.find();

      registrations.forEach((reg) => {
        const eventData = {
          eventName,
          eventId: reg._id,
          players: [],
        };

        // helper fn
        const addPlayer = (person, role = "player") => {
          if (!person) return;
          const name = person.fullname || person.leadName || person.name;
          if (!name) return;
          eventData.players.push({
            role,
            name,
            email: person.email || null,
            phoneNumber: person.phoneNumber || person.contactNumber || null,
            aadharId: person.aadharId || null,
          });
        };

        // 1️⃣ Add lead / captain / viceCaptain
        addPlayer(reg.lead || { leadName: reg.leadName }, "lead");
        addPlayer(reg.captain, "captain");
        addPlayer(reg.viceCaptain, "viceCaptain");

        // 2️⃣ Add team members if present
        if (reg.team && Array.isArray(reg.team.members)) {
          reg.team.members.forEach((m, idx) =>
            addPlayer(m, `teamMember_${idx + 1}`)
          );
        }

        // 3️⃣ Add players (array or single)
        if (reg.players) {
          if (Array.isArray(reg.players)) {
            reg.players.forEach((p, idx) =>
              addPlayer(p, `player_${idx + 1}`)
            );
          } else if (typeof reg.players === "object") {
            addPlayer(reg.players, "player");
          }
        }

        // 4️⃣ Add substitutes if present
        if (Array.isArray(reg.substitutes)) {
          reg.substitutes.forEach((sub, idx) =>
            addPlayer(sub, `substitute_${idx + 1}`)
          );
        }

        // 5️⃣ Add partnerDetails
        addPlayer(reg.partnerDetails, "partner");

        // 6️⃣ Add coach
        addPlayer(reg.coach, "coach");

        // 7️⃣ Add relay teams if present
        if (Array.isArray(reg.relayTeams)) {
          reg.relayTeams.forEach((team, idx) => {
            if (Array.isArray(team.members)) {
              team.members.forEach((m) =>
                addPlayer(m, `relayTeam_${team.teamName || idx + 1}`)
              );
            }
          });
        }

        results.push(eventData);
      });
    }

    console.log(results, "all players");
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Error fetching event players:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


export const getEventPlayersById = async (req, res) => {
  try {
    const { eventId } = req.params; // expecting /api/events/:eventId

    let found = false;
    let eventData = null;

    for (const [eventName, Model] of Object.entries(EVENT_MODELS)) {
      const reg = await Model.findById(eventId);
      if (reg) {
        found = true;

        eventData = {
          eventName,
          eventId: reg._id,
          players: []
        };

        // 1️⃣ Add main lead / captain
        if (reg.leadName || (reg.captain && reg.captain.fullname)) {
          const lead = reg.leadName ? reg : reg.captain;
          eventData.players.push({
            name: lead.fullname || lead.leadName || lead.name || null,
            email: lead.email || null,
            phoneNumber: lead.phoneNumber || lead.contactNumber || null,
            aadharId: lead.aadharId || null
          });
        }
        if (reg.coach) {
          eventData.players.push({
            name: reg.coach.fullname,
            email: reg.coach.email,
            phoneNumber: reg.coach.phoneNumber,
            aadharId: reg.coach.aadharId
          });
        }

        // 2️⃣ Add team members if present
        if (reg.team && Array.isArray(reg.team.members)) {
          reg.team.members.forEach(member => {
            if (member.fullname || member.name) {
              eventData.players.push({
                name: member.fullname || member.name,
                email: member.email || null,
                phoneNumber: member.phoneNumber || member.contactNumber || null,
                aadharId: member.aadharId || null
              });
            }
          });
        }

        // 3️⃣ Add players array (array or single object)
        if (reg.players) {
          if (Array.isArray(reg.players)) {
            reg.players.forEach(player => {
              if (player.fullname || player.name) {
                eventData.players.push({
                  name: player.fullname || player.name,
                  email: player.email || null,
                  phoneNumber: player.phoneNumber || player.contactNumber || null,
                  aadharId: player.aadharId || null
                });
              }
            });
          } else if (typeof reg.players === 'object') {
            if (reg.players.fullname || reg.players.name) {
              eventData.players.push({
                name: reg.players.fullname || reg.players.name,
                email: reg.players.email || null,
                phoneNumber: reg.players.phoneNumber || reg.players.contactNumber || null,
                aadharId: reg.players.aadharId || null
              });
            }
          }
        }

        // 4️⃣ Add partnerDetails if present
        if (reg.partnerDetails && (reg.partnerDetails.name || reg.partnerDetails.fullname)) {
          eventData.players.push({
            name: reg.partnerDetails.fullname || reg.partnerDetails.name,
            email: reg.partnerDetails.email || null,
            phoneNumber: reg.partnerDetails.phoneNumber || null,
            aadharId: reg.partnerDetails.aadharId || null
          });
        }

        // 5️⃣ Add coach if present
        if (reg.coach && (reg.coach.name || reg.coach.fullname)) {
          eventData.players.push({
            name: reg.coach.fullname || reg.coach.name,
            email: reg.coach.email || null,
            phoneNumber: reg.coach.phoneNumber || null,
            aadharId: reg.coach.aadharId || null
          });
        }

        break; // we found the registration, no need to check other models
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.json({ success: true, data: eventData });
  } catch (err) {
    console.error("Error fetching event by ID:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// export const getUserEventRegistrations = async (req, res) => {
//   try {
//     console.log("HELLO")
//     const userId = req.user._id;
//     if (!userId) {
//       return res.status(400).json({ success: false, message: "User ID required" });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     const eventResults = [];

//     for (const regInfo of user.eventRegistrations) {
//       const { event: eventName, registrationId } = regInfo;

//       const Model = EVENT_MODELS[eventName];
//       if (!Model) continue;

//       const reg = await Model.findById(registrationId);
//       console.log(reg, "reg details")
//       if (!reg) continue;

//       const eventData = {
//         eventName,
//         eventId: reg._id,
//         players: []
//       };
//       // console.log(reg, "vfgbhj")

//       if (eventName === "athletics") {
//         // Lead
//         if (reg.leadName) {
//           eventData.players.push({
//             name: reg.leadName,
//             email: reg.email || null,
//             phoneNumber: reg.phoneNumber || null,
//             aadharId: reg.aadharId || null
//           });
//         }

//         if (reg.coach) {
//           eventData.players.push({
//             name: reg.coach.fullname,
//             email: reg.coach.email,
//             phoneNumber: reg.coach.phoneNumber,
//             aadharId: reg.coach.aadharId
//           });
//         }

//         // Relay Teams
//         if (Array.isArray(reg.relayTeams)) {
//           reg.relayTeams.forEach(team => {
//             if (Array.isArray(team.members)) {
//               team.members.forEach(member => {
//                 if (member.fullname || member.name) {
//                   eventData.players.push({
//                     name: member.fullname || member.name,
//                     email: member.email || null,
//                     phoneNumber: member.phoneNumber || member.contactNumber || null,
//                     aadharId: member.aadharId || null
//                   });
//                 }
//               });
//             }
//           });
//         }

//         // Individual Events (optional metadata)
//         if (Array.isArray(reg.individualEvents) && reg.individualEvents.length > 0) {
//           eventData.individualEvents = reg.individualEvents;
//         }

//       } else {

//         if (reg.leadName || (reg.captain && reg.captain.fullname)) {
//           const lead = reg.leadName ? reg : reg.captain;
//           eventData.players.push({
//             name: lead.fullname || lead.leadName || lead.name || null,
//             email: lead.email || null,
//             phoneNumber: lead.phoneNumber || lead.contactNumber || null,
//             aadharId: lead.aadharId || null
//           });
//         }

//         if (reg.team && Array.isArray(reg.team.members)) {
//           reg.team.members.forEach(member => {
//             if (member.fullname || member.name) {
//               eventData.players.push({
//                 name: member.fullname || member.name,
//                 email: member.email || null,
//                 phoneNumber: member.phoneNumber || member.contactNumber || null,
//                 aadharId: member.aadharId || null
//               });
//             }
//           });
//         }

//         if (reg.players) {
//           if (Array.isArray(reg.players)) {
//             reg.players.forEach(player => {
//               if (player.fullname || player.name) {
//                 eventData.players.push({
//                   name: player.fullname || player.name,
//                   email: player.email || null,
//                   phoneNumber: player.phoneNumber || player.contactNumber || null,
//                   aadharId: player.aadharId || null
//                 });
//               }
//             });
//           } else if (typeof reg.players === "object") {
//             if (reg.players.fullname || reg.players.name) {
//               eventData.players.push({
//                 name: reg.players.fullname || reg.players.name,
//                 email: reg.players.email || null,
//                 phoneNumber: reg.players.phoneNumber || reg.players.contactNumber || null,
//                 aadharId: reg.players.aadharId || null
//               });
//             }
//           }
//         }

//         if (reg.partnerDetails && (reg.partnerDetails.name || reg.partnerDetails.fullname)) {
//           eventData.players.push({
//             name: reg.partnerDetails.fullname || reg.partnerDetails.name,
//             email: reg.partnerDetails.email || null,
//             phoneNumber: reg.partnerDetails.phoneNumber || null,
//             aadharId: reg.partnerDetails.aadharId || null
//           });
//         }

//         if (reg.coach && (reg.coach.name || reg.coach.fullname)) {
//           eventData.players.push({
//             name: reg.coach.fullname || reg.coach.name,
//             email: reg.coach.email || null,
//             phoneNumber: reg.coach.phoneNumber || null,
//             aadharId: reg.coach.aadharId || null
//           });
//         }
//       }

//       eventResults.push(eventData);
//     }

//     console.log(eventResults, "user events")

//     return res.json({ success: true, data: eventResults });
//   } catch (err) {
//     console.error("Error fetching user event registrations:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };




