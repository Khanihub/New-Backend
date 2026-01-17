// InterestController.js - UPDATED VERSION

import Interest from "../model/Interest.js"
import Match from "../model/Match.js"
import Profile from "../model/Profile.js"

// SEND INTEREST (keep existing)
export const sendInterest = async (req, res) => {
  const { to } = req.body

  const already = await Interest.findOne({
    from: req.user.id,
    to
  })
  if (already) {
    return res.status(400).json({ message: "Interest already sent" })
  }

  const interest = await Interest.create({
    from: req.user.id,
    to
  })

  res.status(201).json(interest)
}
export const getMyInterests = async (req, res) => {
  try {
    const userId = req.user.id

    const interests = await Interest.find({ from: userId })
      .populate('to', 'fullName image') // optional: populate profile info

    res.status(200).json({ interests })
  } catch (err) {
    console.error('Error fetching interests:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// ACCEPT INTEREST (keep existing)
export const acceptInterest = async (req, res) => {
  const interest = await Interest.findById(req.params.id)

  if (!interest || interest.to.toString() !== req.user.id) {
    return res.status(404).json({ message: "Interest not found" })
  }

  interest.status = "accepted"
  await interest.save()

  // CREATE MATCH
  const match = await Match.create({
    users: [interest.from, interest.to]
  })

  res.json({ match })
}

// ========== NEW FUNCTIONS FOR SHORTLIST ==========

// Add to shortlist (NEW)
export const addToShortlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    // Get user's profile
    const userProfile = await Profile.findOne({ user: userId });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Your profile not found' 
      });
    }

    // Initialize shortlist if it doesn't exist
    if (!userProfile.shortlist) {
      userProfile.shortlist = [];
    }

    // Check if already in shortlist
    if (userProfile.shortlist.includes(profileId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already in shortlist' 
      });
    }

    // Add to shortlist
    userProfile.shortlist.push(profileId);
    await userProfile.save();

    res.status(200).json({
      success: true,
      message: 'Added to shortlist successfully'
    });

  } catch (error) {
    console.error('Error adding to shortlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding to shortlist', 
      error: error.message 
    });
  }
};

// Remove from shortlist (NEW)
export const removeFromShortlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    const userProfile = await Profile.findOne({ user: userId });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile not found' 
      });
    }

    if (!userProfile.shortlist) {
      return res.status(400).json({ 
        success: false, 
        message: 'Shortlist is empty' 
      });
    }

    // Remove from shortlist
    userProfile.shortlist = userProfile.shortlist.filter(
      id => id.toString() !== profileId
    );
    await userProfile.save();

    res.status(200).json({
      success: true,
      message: 'Removed from shortlist'
    });

  } catch (error) {
    console.error('Error removing from shortlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error removing from shortlist', 
      error: error.message 
    });
  }
};

// Get shortlisted profiles (NEW)
export const getShortlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfile = await Profile.findOne({ user: userId })
      .populate({
        path: 'shortlist',
        populate: { path: 'user', select: 'email' }
      });

    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Profile not found' 
      });
    }

    res.status(200).json({
      success: true,
      shortlist: userProfile.shortlist || []
    });

  } catch (error) {
    console.error('Error fetching shortlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching shortlist', 
      error: error.message 
    });
  }
};