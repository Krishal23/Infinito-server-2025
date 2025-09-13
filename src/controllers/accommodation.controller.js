import { Accommodation } from "../models/accommodation.model.js";
import { EVENT_MODELS } from "../models/eventRegistration.model.js";
import { User } from "../models/user.model.js";
import Coupon from "../models/coupon.model.js"; // import coupon model

// Helper: Check if event exists
const isValidEventId = async (eventId) => {
  for (const modelName in EVENT_MODELS) {
    const model = EVENT_MODELS[modelName];
    const exists = await model.exists({ _id: eventId });
    if (exists) return true;
  }
  return false;
};


export const createAccommodation = async (req, res) => {
  try {
    const userId = req?.user?._id;
    if (!userId) return res.status(401).json({ message: "User not logged in" });

    const { eventId, genderCategory, checkInDate, stayDays, players, couponCode } = req.body;

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

    // Fees
    const accommodationFee = 500 * players.length * stayDays;
    const mealsFee = 200 * players.length * stayDays;

    // Coupon logic using DB
    let couponDiscount = 0;
    let isCouponApplied = false;

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponTag: couponCode, isLive: true });
      if (!coupon) {
        return res.status(400).json({ message: "Invalid or inactive coupon" });
      }

      if (new Date() > coupon.validUpto) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (coupon.couponType === "flat") {
        couponDiscount = coupon.discount;
      } else if (coupon.couponType === "percentage") {
        couponDiscount = Math.floor((coupon.discount / 100) * (accommodationFee + mealsFee));
      }

      isCouponApplied = true;

      // Add user to coupon's usedBy
      coupon.usedBy.push(userId);
      await coupon.save();
    }

    // Prepare accommodation object
    const newAccommodation = new Accommodation({
      userId,
      eventId,
      genderCategory,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      players,
      accommodationFee,
      mealsFee,
      couponCode: couponCode || null,
      couponDiscount,
      isCouponApplied,
      totalAmount: accommodationFee + mealsFee - couponDiscount,
      createdBy: userId.toString(),
    });

    await newAccommodation.save();

    await User.findByIdAndUpdate(userId, { $push: { accommodations: newAccommodation._id } });

    res.status(201).json({
      message: "Accommodation booked successfully",
      accommodation: newAccommodation,
    });
  } catch (error) {
    console.error("Error creating accommodation:", error);
    res.status(500).json({ message: "Internal server error", error });
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

    const accommodations = await Accommodation.find(filter);

    if (!accommodations || accommodations.length === 0) {
      return res.status(404).json({ message: "No accommodation found" });
    }

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


