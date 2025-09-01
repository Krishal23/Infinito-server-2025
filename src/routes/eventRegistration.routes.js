import express from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { EVENT_MODELS } from "../models/eventRegistration.model.js"; 
import { createEventOrder, verifyAndRegister } from "../controllers/eventRegistration.controller.js";
import { getEventRegistrations } from "../controllers/eventRegistration.controller.js";

const router = express.Router();

const EVENTS = [
    "athletics", "badminton", "basketball", "chess", "cricket",
    "football", "kabaddi", "lawn_tennis", "squash",
    "table_tennis", "volleyball", "weight_lifting","power_lifting", "codm","bgmi","valorant","freefire","clash_royale"
];


EVENTS.forEach((event) => {
  // const key = event.replace(/-/g, "_"); // "weight_lifting" -> "weight_lifting"
  const EventModel = EVENT_MODELS[event]; // get the actual model

  // if (!EventModel) {
  //     console.warn(`No model found for event: ${event} (key: ${key})`);
  //     return;
  // }

  router.post(
      `/${event}/create-order`,
      authenticateUser,
      createEventOrder(event) // eventKey as string
  );

  router.post(
      `/${event}/verify-payment`,
      authenticateUser,
      verifyAndRegister(EventModel, event) // pass EventModel + key
  );

  router.get(
      `/${event}/registrations`,
      authenticateUser,
      getEventRegistrations(event) // pass key string
  );
});


export default router;
