import express from "express";
import { createConsent } from "../controllers/consent.controller.js";


const consentRouter = express.Router()

consentRouter.post("/", createConsent);
export default consentRouter;