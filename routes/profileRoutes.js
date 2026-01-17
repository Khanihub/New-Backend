// routes/profileRoutes.js - COMPLETE PROFILE ROUTES

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';
import { 
  createProfile, 
  updateProfile, 
  getMyProfile,
  deleteProfile,
  getApprovedProfiles,
  updateProfileStatus
} from '../controller/ProfileController.js';

const router = express.Router();

// User profile routes (protected)
router.post('/', protect, upload.single('image'), createProfile);
router.put('/', protect, upload.single('image'), updateProfile);
router.get('/me', protect, getMyProfile);
router.delete('/', protect, deleteProfile);

// Admin routes (you can add admin middleware if needed)
router.get('/approved', getApprovedProfiles);
router.patch('/:id/status', updateProfileStatus);

export default router;