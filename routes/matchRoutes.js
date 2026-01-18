import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { 
  getMyMatches, 
  sendInterest,
  getBrowseMatches,
  getFilteredBrowseMatches,
  deleteMatch  // ⭐ ADD THIS
} from "../controllers/MatchController.js"

const router = express.Router()

router.get("/browse/filter", protect, getFilteredBrowseMatches)
router.get("/browse", protect, getBrowseMatches)
router.get("/", protect, getMyMatches)
router.post("/interest/:userId", protect, sendInterest)
router.delete("/:matchId", protect, deleteMatch)  // ⭐ ADD THIS

export default router