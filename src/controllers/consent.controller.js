import Consent from "../models/consent.model.js";
import { CatchAsyncErrror } from "../middlewares/catchAsyncError.js";



export const createConsent = CatchAsyncErrror(async (req, res) => {
    const {name, email, issue, description, consentDate} = req.body;
    if(!name || !email || !issue || !description ){
        return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const allowedIssues = ["events", "accommodation", "merch", "other"];
    const normalizedIssue = issue.toLowerCase();
    if(!allowedIssues.includes(normalizedIssue)){
        return res.status(400).json({ success: false, message: "Invalid issue" });
    }
    const consent = await Consent.create({
        name: String(name).trim(),
        email: String(email).trim(),
        issue: normalizedIssue,
        description: String(description).trim()
    })
    return res.status(201).json({success: true, message: "Consent Created Successfully", consent})

})
