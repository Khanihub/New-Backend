import express from "express";
import {
  createProfile,
  getMyProfile,
  updateProfile,
  deleteProfile,
  getApprovedProfiles,
  updateProfileStatus
} from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Get my profile - matches GET /api/profile/me
router.get("/me", protect, getMyProfile);

// Create profile - matches POST /api/profile  
router.post("/", protect, upload.single("image"), createProfile);

// Update profile - matches PUT /api/profile/me
router.put("/me", protect, upload.single("image"), updateProfile);

// Delete profile
router.delete("/delete", protect, deleteProfile);

// Get approved profiles
router.get("/approved", getApprovedProfiles);

// Admin: update profile status
// router.put("/:id/status", protect, adminOnly, updateProfileStatus);

export default router;