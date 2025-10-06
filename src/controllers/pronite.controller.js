import { Pronite } from "../models/pronite.model.js";
import { User } from "../models/user.model.js";
import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import cloudinary from "../config/cloudinary.js";

export const registerForPronite = async (req, res) => {
  try {
    const { name, adhaar, phone, collegeName, address, transactionId, amountPaid, paymentProof } = req.body;
    if (!paymentProof) return res.status(400).json({ msg: "Payment proof required" });

    const newRegistration = await Pronite.create({
      userId: req.user._id,
      name,
      adhaar,
      phone,
      collegeName,
      address,
      transactionId,
      amountPaid,
      paymentProof,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { proniteRegistrations: newRegistration._id },
    });

    res.status(201).json({ msg: "Registration successful", data: newRegistration });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

// export const registerForPronite = async (req, res) => {
//   try {
//     console.log("Incoming Pronite registration request:");
//     console.log("User ID:", req?.user?._id);
//     console.log("Body:", req.body);
//     if (req.file) {
//       console.log("Uploaded file:", {
//         originalname: req.file.originalname,
//         mimetype: req.file.mimetype,
//         size: req.file.size,
//         path: req.file.path,
//       });
//     } else {
//       console.log("No file uploaded");
//     }


//     const userId = req?.user?._id;
//     if (!userId) return res.status(401).json({ msg: "Unauthorized" });

//     const { name, email, adhaar, phone, collegeName, address, transactionId, amountPaid } = req.body;

//     // Required fields validation
//     if (!name?.trim()) return res.status(400).json({ msg: "Name is required" });
//     if (!email?.trim()) return res.status(400).json({ msg: "Email is required" });
//     if (!adhaar?.trim()) return res.status(400).json({ msg: "Adhaar is required" });
//     if (!phone?.trim()) return res.status(400).json({ msg: "Phone number is required" });
//     if (!address?.trim()) return res.status(400).json({ msg: "Address is required" });
//     if (!transactionId?.trim()) return res.status(400).json({ msg: "Transaction ID is required" });
//     if (!amountPaid) return res.status(400).json({ msg: "Amount paid is required" });
//     if (!req.file) return res.status(400).json({ msg: "Payment proof is required" });

//     // Upload file to Cloudinary
//     const result = await cloudinary.uploader.upload(req.file.path, {
//       folder: "pronitePaymentProofs",
//     });
//     const paymentProofUrl = result.secure_url;

//     // Check if user already registered
//     const existing = await Pronite.findOne({ userId });
//     if (existing) return res.status(400).json({ msg: "Already registered for Pronite" });

//     // Create registration
//     const registration = await Pronite.create({
//       userId,
//       name: name.trim(),
//       email: email.trim(),
//       adhaar: adhaar.trim(),
//       phone: phone.trim(),
//       collegeName: collegeName?.trim() || "",
//       address: address.trim(),
//       transactionId: transactionId.trim(),
//       amountPaid,
//       paymentProof: paymentProofUrl,
//     });

//     // Link to user
//     await User.findByIdAndUpdate(userId, { $push: { proniteRegistrations: registration._id } });

//     res.status(201).json({ msg: "Pronite registration successful", registration });
//   } catch (error) {
//     console.error("Pronite registration error:", error.message || error);
//     res.status(500).json({ msg: error.message || "Internal server error" });
//   }
// };
export const getMyProniteRegistration = CatchAsyncErrror(async (req, res) => {
  const userId = req.user._id;

  // Fetch the user and populate proniteRegistrations
  const user = await User.findById(userId).populate({
    path: "proniteRegistrations",
    select: "name adhaar phone collegeName address transactionId amountPaid paymentProof registrationDate"
  });

  if (!user || !user.proniteRegistrations || user.proniteRegistrations.length === 0) {
    return res.status(404).json({ msg: "No Pronite registrations found for this user." });
  }

 return res.status(200).json({
    user: {
      username: user.username,
      email: user.email
    },
    registrations: user.proniteRegistrations
  });
});

// Fetch all pronite registrations for admin
export const getAllProniteRegistrations = CatchAsyncErrror(async (req, res) => {
  const registrations = await Pronite.find()
    .populate({
      path: "userId",
      select: "username email",
    })
    .sort({ registrationDate: -1 }); // latest first

  if (!registrations || registrations.length === 0) {
    return res.status(404).json({ msg: "No Pronite registrations found." });
  }

  res.status(200).json({ registrations });
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
