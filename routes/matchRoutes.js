import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  getMyMatches, 
  sendInterest,
  getBrowseMatches,
  getFilteredBrowseMatches,
  deleteMatch,
  getFriends // ⭐ NEW: Get friends endpoint
} from "../controllers/MatchController.js";

const router = express.Router();

router.get("/browse/filter", protect, getFilteredBrowseMatches);
router.get("/browse", protect, getBrowseMatches);
router.get("/friends", protect, getFriends); // ⭐ NEW: Get friends (mutual interests)
router.get("/", protect, getMyMatches);
router.post("/interest/:userId", protect, sendInterest);
router.delete("/:matchId", protect, deleteMatch);

export default router;