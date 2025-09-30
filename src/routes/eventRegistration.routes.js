import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { EVENT_MODELS } from "../models/EventModelFinal.js";
import { createEventOrder, getAllEventPlayers, getAllRegistrations, getMyRegistrations, getRegisteredEvents, getUserEventRegistrations, registerWithProof, verifyAndRegister } from "../controllers/eventRegistration.controller.js";
import { getEventRegistrations } from "../controllers/eventRegistration.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";
import { upload } from "../config/multer.js";

const router = express.Router();

const EVENTS = [
    "athletics", "badminton", "basketball", "chess", "cricket",
    "football", "kabaddi", "lawn_tennis", "squash",
    "table_tennis", "volleyball", "weight_lifting","power_lifting", "codm","bgmi","valorant","freefire","clash_royale"
];


EVENTS.forEach((event) => {
  const EventModel = EVENT_MODELS[event];

    router.post(
    `/${event}`,
    verifyToken,
    upload.single("paymentProof"),
    registerWithProof(EventModel, event)
  );

  router.post(
      `/${event}/create-order`,
      verifyToken,
      createEventOrder(event)
  );

  router.post(
      `/${event}/verify-payment`,
      verifyToken,
      verifyAndRegister(EventModel, event)
  );

  router.get(
      `/${event}/registrations`,
      verifyToken,
      authorizeRole("admin","moderator"), 
      getEventRegistrations(event) 
  );

    router.get(
        "/my-registrations", 
        verifyToken, 
        getMyRegistrations
    );

    router.get(
        "/all-registrations",
        verifyToken,
        authorizeRole("admin","moderator"), 
        getAllRegistrations
    );

    router.get(
        "/registered-events-name",
        verifyToken,
        getRegisteredEvents
    );
    
    router.get("/all-players", getAllEventPlayers);
    router.get("/event-players", getUserEventRegistrations);
    router.get("/my-event-players", verifyToken,getUserEventRegistrations);
    
});





export default router;
