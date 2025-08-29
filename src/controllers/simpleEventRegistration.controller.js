import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { SimpleEventRegistration } from "../models/simpleEventRegistration.model.js";

export const registerSimpleEvent = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { event, name, email, phoneNumber, collegeName, collegeAddress, gender, userId, extras } = req.body;
        if (!event || !name || !email || !phoneNumber || !collegeName || !collegeAddress) {
            return next(new ErrorHandler("Missing required fields", 400));
        }
        const doc = await SimpleEventRegistration.create({ event, name, email, phoneNumber, collegeName, collegeAddress, gender, userId, extras });
        try { console.log("SimpleEventRegistration created:", { id: doc._id.toString(), event: doc.event, name: doc.name }); } catch { }
        res.status(201).json({ success: true, message: "Registered successfully", registration: doc });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const listSimpleEvents = CatchAsyncErrror(async (req, res, next) => {
    try {
        const { event } = req.query;
        const filter = {};
        if (event) filter.event = event;
        const items = await SimpleEventRegistration.find(filter).sort({ createdAt: -1 }).limit(100);
        res.json({ success: true, count: items.length, items });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});


