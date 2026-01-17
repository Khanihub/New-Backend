// intrestRoutes.js - UPDATED VERSION

import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import { 
  sendInterest, 
  acceptInterest,
  addToShortlist,
  removeFromShortlist,
  getShortlist 
} from "../controllers/InterestController.js"

const router = express.Router()

// Existing routes
router.post("/", protect, sendInterest)
router.put("/:id/accept", protect, acceptInterest)

// NEW shortlist routes
router.post("/shortlist/add", protect, addToShortlist)
router.post("/shortlist/remove", protect, removeFromShortlist)
router.get("/shortlist", protect, getShortlist)

export default router