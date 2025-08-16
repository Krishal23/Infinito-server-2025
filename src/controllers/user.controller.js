import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import { User } from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";

export const getMe = CatchAsyncErrror(async (req, res, next) => {
    const userId = req.user?._id;

    if (!userId) {
        return next(new ErrorHandler("User not found", 404));
    }

    const user = await User.findById(userId)
                    .select("-password -refreshToken")
                    .populate('caApplication');

    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }

    res.status(200).json({
        success: true,
        user
    });
});


//getAllUsers --admin
export const getAllUsers = CatchAsyncErrror(async (req, res, next) => {
    const users = await User.find().select("-password -refreshToken -__v");
    if (!users || users.length === 0) {
        return next(new ErrorHandler("No users found", 404));
    }
    res.status(200).json({
        success: true,
        users
    });
});



//updateRole --admin
export const updateRole = CatchAsyncErrror(async (req, res, next) => {
    const userId=req.params;
    const finalRole=req.body.role;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }
if (user.role === finalRole) {
        await user.save(); 
        return res.status(200).json({ success: true, message: "Role is already up-to-date", user });
    }
 if (finalRole === "CA" || finalRole === "moderator") {
        user.role = finalRole;
        await user.save();
        return res.status(200).json({ success: true, message: `Role updated to ${finalRole}`, user });
    } else {
        return res.status(400).json({ success: false, message: "Invalid role provided" });
    }
});



