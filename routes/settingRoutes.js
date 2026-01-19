import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getSettings,
  updateProfile,
  changePassword,
  updatePrivacy,
  updateNotifications,
  deleteAccount,      // NEW
  deactivateAccount   // NEW
} from "../controllers/settingController.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, changePassword);
router.put("/privacy", protect, updatePrivacy);
router.put("/notifications", protect, updateNotifications);
router.delete("/delete", protect, deleteAccount);          // NEW
router.put("/deactivate", protect, deactivateAccount);     // NEW

export default router;