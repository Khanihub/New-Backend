// intrestRoutes.js - COMPLETE VERSION WITH NOTIFICATIONS

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  sendInterest, 
  acceptInterest,
  rejectInterest,
  getNotifications,
  getUnreadCount,
  getSentInterests,
  addToShortlist,
  removeFromShortlist,
  getShortlist 
} from "../controllers/InterestController.js";

const router = express.Router();

// Interest routes
router.post("/", protect, sendInterest);
router.put("/:id/accept", protect, acceptInterest);
router.put("/:id/reject", protect, rejectInterest);

// Notification routes
router.get("/notifications", protect, getNotifications);
router.get("/notifications/unread-count", protect, getUnreadCount);
router.get("/sent", protect, getSentInterests);

// Shortlist routes
router.post("/shortlist/add", protect, addToShortlist);
router.post("/shortlist/remove", protect, removeFromShortlist);
router.get("/shortlist", protect, getShortlist);

export default router;