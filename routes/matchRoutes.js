import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getMyMatches, 
  sendInterest,
  getBrowseMatches,
  getFilteredBrowseMatches,
  deleteMatch,
  getFriends,
  getFriendRequests // ⭐ NEW
} from "../controllers/MatchController.js";

const router = express.Router();

router.get("/browse/filter", protect, getFilteredBrowseMatches);
router.get("/browse", protect, getBrowseMatches);
router.get("/friends", protect, getFriends);
router.get("/requests", protect, getFriendRequests); // ⭐ NEW: Get pending friend requests
router.get("/", protect, getMyMatches);
router.post("/interest/:userId", protect, sendInterest);
router.delete("/:matchId", protect, deleteMatch);

export default router;