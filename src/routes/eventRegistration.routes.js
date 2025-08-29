import express from "express";
import { authenticateUser, authorizeRoles } from "../middlewares/auth.js";
import {
  // Athletics
  registerForAthletics,
  getMyAthleticsRegistration,
  getAllAthleticsRegistrations,
  updateAthleticsRegistrationStatus,
  cancelAthleticsRegistration,

  // Badminton
  registerForBadminton,
  getMyBadmintonRegistration,
  getAllBadmintonRegistrations,
  updateBadmintonRegistrationStatus,
  cancelBadmintonRegistration,

  // Basketball
  registerForBasketball,
  getMyBasketballRegistration,
  getAllBasketballRegistrations,
  updateBasketballRegistrationStatus,
  cancelBasketballRegistration,

  // Chess
  registerForChess,
  getMyChessRegistration,
  getAllChessRegistrations,
  updateChessRegistrationStatus,
  cancelChessRegistration,

  // Cricket
  registerForCricket,
  getMyCricketRegistration,
  getAllCricketRegistrations,
  updateCricketRegistrationStatus,
  cancelCricketRegistration,

  // Football
  registerForFootball,
  getMyFootballRegistration,
  getAllFootballRegistrations,
  updateFootballRegistrationStatus,
  cancelFootballRegistration,

  // Kabaddi
  registerForKabaddi,
  getMyKabaddiRegistration,
  getAllKabaddiRegistrations,
  updateKabaddiRegistrationStatus,
  cancelKabaddiRegistration,

  // Lawn Tennis
  registerForLawnTennis,
  getMyLawnTennisRegistration,
  getAllLawnTennisRegistrations,
  updateLawnTennisRegistrationStatus,
  cancelLawnTennisRegistration,

  // Squash
  registerForSquash,
  getMySquashRegistration,
  getAllSquashRegistrations,
  updateSquashRegistrationStatus,
  cancelSquashRegistration,

  // Table Tennis
  registerForTableTennis,
  getMyTableTennisRegistration,
  getAllTableTennisRegistrations,
  updateTableTennisRegistrationStatus,
  cancelTableTennisRegistration,

  // Volleyball
  registerForVolleyball,
  getMyVolleyballRegistration,
  getAllVolleyballRegistrations,
  updateVolleyballRegistrationStatus,
  cancelVolleyballRegistration,

  // Weight Lifting
  registerForWeightLifting,
  getMyWeightLiftingRegistration,
  getAllWeightLiftingRegistrations,
  updateWeightLiftingRegistrationStatus,
  cancelWeightLiftingRegistration,

  // Utility functions
  getMyAllEventRegistrations,
  getEventRegistrationStats
} from "../controllers/eventRegistration.controller.js";

const router = express.Router();

// =============================================================================
// ATHLETICS ROUTES
// =============================================================================
router.post("/athletics/register", registerForAthletics);
router.get("/athletics/my-registration", authenticateUser, getMyAthleticsRegistration);
router.delete("/athletics/cancel", authenticateUser, cancelAthleticsRegistration);

// Admin/Moderator routes for Athletics
router.get("/athletics/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllAthleticsRegistrations);
router.put("/athletics/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateAthleticsRegistrationStatus);

// =============================================================================
// BADMINTON ROUTES
// =============================================================================
router.post("/badminton/register", registerForBadminton);
router.get("/badminton/my-registration", authenticateUser, getMyBadmintonRegistration);
router.delete("/badminton/cancel", authenticateUser, cancelBadmintonRegistration);

// Admin/Moderator routes for Badminton
router.get("/badminton/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllBadmintonRegistrations);
router.put("/badminton/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateBadmintonRegistrationStatus);

// =============================================================================
// BASKETBALL ROUTES
// =============================================================================
router.post("/basketball/register", registerForBasketball);
router.get("/basketball/my-registration", authenticateUser, getMyBasketballRegistration);
router.delete("/basketball/cancel", authenticateUser, cancelBasketballRegistration);

// Admin/Moderator routes for Basketball
router.get("/basketball/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllBasketballRegistrations);
router.put("/basketball/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateBasketballRegistrationStatus);

// =============================================================================
// CHESS ROUTES
// =============================================================================
router.post("/chess/register", registerForChess);
router.get("/chess/my-registration", authenticateUser, getMyChessRegistration);
router.delete("/chess/cancel", authenticateUser, cancelChessRegistration);

// Admin/Moderator routes for Chess
router.get("/chess/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllChessRegistrations);
router.put("/chess/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateChessRegistrationStatus);

// =============================================================================
// CRICKET ROUTES
// =============================================================================
router.post("/cricket/register", registerForCricket);
router.get("/cricket/my-registration", authenticateUser, getMyCricketRegistration);
router.delete("/cricket/cancel", authenticateUser, cancelCricketRegistration);

// Admin/Moderator routes for Cricket
router.get("/cricket/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllCricketRegistrations);
router.put("/cricket/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateCricketRegistrationStatus);

// =============================================================================
// FOOTBALL ROUTES
// =============================================================================
router.post("/football/register", registerForFootball);
router.get("/football/my-registration", authenticateUser, getMyFootballRegistration);
router.delete("/football/cancel", authenticateUser, cancelFootballRegistration);

// Admin/Moderator routes for Football
router.get("/football/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllFootballRegistrations);
router.put("/football/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateFootballRegistrationStatus);

// =============================================================================
// KABADDI ROUTES
// =============================================================================
router.post("/kabaddi/register", registerForKabaddi);
router.get("/kabaddi/my-registration", authenticateUser, getMyKabaddiRegistration);
router.delete("/kabaddi/cancel", authenticateUser, cancelKabaddiRegistration);

// Admin/Moderator routes for Kabaddi
router.get("/kabaddi/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllKabaddiRegistrations);
router.put("/kabaddi/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateKabaddiRegistrationStatus);

// =============================================================================
// LAWN TENNIS ROUTES
// =============================================================================
router.post("/lawn-tennis/register", registerForLawnTennis);
router.get("/lawn-tennis/my-registration", authenticateUser, getMyLawnTennisRegistration);
router.delete("/lawn-tennis/cancel", authenticateUser, cancelLawnTennisRegistration);

// Admin/Moderator routes for Lawn Tennis
router.get("/lawn-tennis/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllLawnTennisRegistrations);
router.put("/lawn-tennis/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateLawnTennisRegistrationStatus);

// =============================================================================
// SQUASH ROUTES
// =============================================================================
router.post("/squash/register", registerForSquash);
router.get("/squash/my-registration", authenticateUser, getMySquashRegistration);
router.delete("/squash/cancel", authenticateUser, cancelSquashRegistration);

// Admin/Moderator routes for Squash
router.get("/squash/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllSquashRegistrations);
router.put("/squash/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateSquashRegistrationStatus);

// =============================================================================
// TABLE TENNIS ROUTES
// =============================================================================
router.post("/table-tennis/register", registerForTableTennis);
router.get("/table-tennis/my-registration", authenticateUser, getMyTableTennisRegistration);
router.delete("/table-tennis/cancel", authenticateUser, cancelTableTennisRegistration);

// Admin/Moderator routes for Table Tennis
router.get("/table-tennis/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllTableTennisRegistrations);
router.put("/table-tennis/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateTableTennisRegistrationStatus);

// =============================================================================
// VOLLEYBALL ROUTES
// =============================================================================
router.post("/volleyball/register", registerForVolleyball);
router.get("/volleyball/my-registration", authenticateUser, getMyVolleyballRegistration);
router.delete("/volleyball/cancel", authenticateUser, cancelVolleyballRegistration);

// Admin/Moderator routes for Volleyball
router.get("/volleyball/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllVolleyballRegistrations);
router.put("/volleyball/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateVolleyballRegistrationStatus);

// =============================================================================
// WEIGHT LIFTING ROUTES
// =============================================================================
router.post("/weight-lifting/register", registerForWeightLifting);
router.get("/weight-lifting/my-registration", authenticateUser, getMyWeightLiftingRegistration);
router.delete("/weight-lifting/cancel", authenticateUser, cancelWeightLiftingRegistration);

// Admin/Moderator routes for Weight Lifting
router.get("/weight-lifting/all", authenticateUser, authorizeRoles("admin", "moderator"), getAllWeightLiftingRegistrations);
router.put("/weight-lifting/:registrationId/status", authenticateUser, authorizeRoles("admin", "moderator"), updateWeightLiftingRegistrationStatus);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Get all user's event registrations
router.get("/my-registrations", authenticateUser, getMyAllEventRegistrations);

// Admin/Moderator route to get event registration statistics
router.get("/stats", authenticateUser, authorizeRoles("admin", "moderator"), getEventRegistrationStats);

export default router;
