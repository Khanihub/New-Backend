import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { 
  getMyMatches, 
  sendInterest,
  getBrowseMatches,
  getFilteredBrowseMatches 
} from "../controllers/MatchController.js"

const router = express.Router()

// IMPORTANT: Put /browse routes BEFORE / route
router.get("/browse/filter", protect, getFilteredBrowseMatches)
router.get("/browse", protect, getBrowseMatches)

// Existing routes
router.get("/", protect, getMyMatches)
router.post("/interest/:userId", protect, sendInterest)

export default router