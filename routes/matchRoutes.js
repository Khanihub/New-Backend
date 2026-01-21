// matchRoutes.js - WITH UNFRIEND ROUTE

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getMyMatches, 
  sendInterest,
  getBrowseMatches,
  getFilteredBrowseMatches,
  deleteMatch,
  getFriends,
  getFriendRequests,
  removeInterestFromMatch,
  unfriend // ⭐ NEW - Import unfriend function
} from "../controllers/MatchController.js";

const router = express.Router();

router.get("/browse/filter", protect, getFilteredBrowseMatches);
router.get("/browse", protect, getBrowseMatches);
router.get("/friends", protect, getFriends);
router.get("/requests", protect, getFriendRequests);
router.get("/", protect, getMyMatches);
router.post("/interest/:userId", protect, sendInterest);
router.put("/:matchId/remove-interest", protect, removeInterestFromMatch);
router.put("/:matchId/unfriend", protect, unfriend); // ⭐ NEW - Unfriend route
router.delete("/:matchId", protect, deleteMatch);

export default router;