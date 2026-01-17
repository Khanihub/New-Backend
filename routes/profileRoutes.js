// D:\Dating App\backend-main\routes\profileRoutes.js

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

// Get my profile
router.get("/me", protect, getMyProfile);

// Create or update profile - Use multer.single with error handling
router.post("/", protect, (req, res, next) => {
  const uploadSingle = upload.single("image");
  
  uploadSingle(req, res, (err) => {
    if (err) {
      // If error is about file type, still process the request without image
      if (err.message === "Only image files (jpg, jpeg, png, gif, webp) are allowed") {
        console.log("Image validation failed, proceeding without image");
        return next();
      }
      // For other errors, return error
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, createProfile);

// Update profile
router.put("/me", protect, (req, res, next) => {
  const uploadSingle = upload.single("image");
  
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.message === "Only image files (jpg, jpeg, png, gif, webp) are allowed") {
        console.log("Image validation failed, proceeding without image");
        return next();
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, updateProfile);

// Delete profile
router.delete("/delete", protect, deleteProfile);

// Get approved profiles
router.get("/approved", getApprovedProfiles);

// Admin: update profile status
// router.put("/:id/status", protect, adminOnly, updateProfileStatus);

export default router;