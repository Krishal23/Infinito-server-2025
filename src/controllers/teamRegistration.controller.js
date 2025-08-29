import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { TeamRegistration } from "../models/teamRegistration.model.js";

export const registerTeam = CatchAsyncErrror(async (req, res, next) => {
    try {
        const leaderId = req.user?._id;
        const { event, teamName, captain, viceCaptain, collegeName, collegeAddress, notes } = req.body;

        if (!event) return next(new ErrorHandler("Event is required", 400));
        if (!captain || !viceCaptain) return next(new ErrorHandler("Captain and Vice-captain are required", 400));
        if (!collegeName || !collegeAddress) return next(new ErrorHandler("College details are required", 400));

        const doc = await TeamRegistration.create({
            event,
            teamName,
            leaderId,
            captain,
            viceCaptain,
            collegeName,
            collegeAddress,
            notes
        });

        res.status(201).json({ success: true, message: "Team registered successfully", team: doc });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const getMyTeam = CatchAsyncErrror(async (req, res, next) => {
    try {
        const leaderId = req.user?._id;
        const { event } = req.query;
        const filter = { leaderId };
        if (event) filter.event = event;
        const team = await TeamRegistration.findOne(filter);
        if (!team) return res.status(404).json({ success: false, message: "No team found" });
        res.json({ success: true, team });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});


