import { Pronite } from "../models/pronite.model.js";
import { User } from "../models/user.model.js";
import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";

export const registerForPronite = CatchAsyncErrror(async (req, res) => {
  const userId = req.user._id;

  const {
    name,
    adhaar,
    phone,
    collegeName,
    address,
    paymentProof,
    transactionId,
    amountPaid,
  } = req.body;

  // Validate required fields
  if (!name?.trim()) return res.status(400).json({ msg: "Name is required" });
  if (!adhaar?.trim()) return res.status(400).json({ msg: "Adhaar is required" });
  if (!phone?.trim()) return res.status(400).json({ msg: "Phone number is required" });
  if (!address?.trim()) return res.status(400).json({ msg: "Address is required" });
  if (!paymentProof?.trim()) return res.status(400).json({ msg: "Payment proof is required" });
  if (!transactionId?.trim()) return res.status(400).json({ msg: "Transaction ID is required" });
  if (!amountPaid) return res.status(400).json({ msg: "Amount paid is required" });

  const existing = await Pronite.findOne({ userId });
  if (existing) {
    return res.status(400).json({ msg: "You have already registered for Pronite" });
  }

  // Create new registration
  const registration = new Pronite({
    userId,
    name: name.trim(),
    adhaar: adhaar.trim(),
    phone: phone.trim(),
    collegeName: collegeName?.trim() || "",
    address: address.trim(),
    paymentProof: paymentProof.trim(),
    transactionId: transactionId.trim(),
    amountPaid,
  });

  await registration.save();

  await User.findByIdAndUpdate(userId, {
    $push: { proniteRegistrations: registration._id },
  });

  return res.status(201).json({
    msg: "Pronite registration successful",
    registration,
  });
});

export const getMyProniteRegistration = CatchAsyncErrror(async (req, res) => {
  const userId = req.user._id;

  const registration = await Pronite.findOne({ userId });
  if (!registration) {
    return res.status(404).json({ msg: "No Pronite registration found for this user." });
  }

  return res.status(200).json({ registration });
});

export const getAllProniteRegistrations = CatchAsyncErrror(async (req, res) => {
  const registrations = await Pronite.find().populate(
    "userId",
    "fullname email username collegeName"
  );

  if (!registrations || registrations.length === 0) {
    return res.status(404).json({ msg: "No Pronite registrations found." });
  }

  return res.status(200).json({ registrations });
});

export const getProniteById = CatchAsyncErrror(async (req, res) => {
  const { id } = req.params;
  const registration = await Pronite.findById(id).populate(
    "userId",
    "fullname email username collegeName"
  );

  if (!registration) {
    return res.status(404).json({ msg: "Registration not found" });
  }

  return res.status(200).json({ registration });
});

export const deleteProniteRegistration = CatchAsyncErrror(async (req, res) => {
  const { id } = req.params;
  const registration = await Pronite.findById(id);

  if (!registration) {
    return res.status(404).json({ msg: "Pronite registration not found" });
  }

  await Pronite.findByIdAndDelete(id);
  await User.findByIdAndUpdate(registration.userId, {
    $pull: { proniteRegistrations: registration._id },
  });

  return res.status(200).json({ msg: "Pronite registration deleted successfully" });
});
