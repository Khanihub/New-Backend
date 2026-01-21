// InterestController.js - COMPLETE VERSION WITH NOTIFICATIONS + DELETE

import Interest from "../model/Interest.js";
import Match from "../model/Match.js";
import Profile from "../model/Profile.js";

// Helper function to get correct image URL
const getImageUrl = (imagePath, gender = null) => {
  // If no image path provided, return gender-based default
  if (!imagePath) {
    if (gender === 'male') {
      return '/assets/Male Pic.png';
    } else if (gender === 'female') {
      return '/assets/female pic.png';
    }
    return '/assets/default-avatar.png';
  }
  
  if (imagePath.startsWith('http')) return imagePath;
  
  const baseUrl = process.env.BACKEND_URL 
    || (process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.NODE_ENV === 'production'
        ? 'https://new-backend-production-766f.up.railway.app'
        : 'http://localhost:5000');
  
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${baseUrl}${path}`;
};

// ========== INTEREST MANAGEMENT ==========

// SEND INTEREST
export const sendInterest = async (req, res) => {
  try {
    console.log('=== SEND INTEREST ===');
    console.log('From:', req.user.id);
    console.log('To:', req.body.to);

    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ 
        success: false,
        message: "Recipient ID is required" 
      });
    }

    // Check if interest already sent
    const already = await Interest.findOne({
      from: req.user.id,
      to
    });

    if (already) {
      return res.status(400).json({ 
        success: false,
        message: "Interest already sent" 
      });
    }

    // Create interest
    const interest = await Interest.create({
      from: req.user.id,
      to,
      status: "pending"
    });

    console.log('Interest created:', interest._id);

    res.status(201).json({
      success: true,
      message: "Interest sent successfully",
      interest
    });

  } catch (error) {
    console.error('Send interest error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error sending interest",
      error: error.message 
    });
  }
};

// ACCEPT INTEREST
export const acceptInterest = async (req, res) => {
  try {
    console.log('=== ACCEPT INTEREST ===');
    console.log('Interest ID:', req.params.id);
    console.log('User ID:', req.user.id);

    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ 
        success: false,
        message: "Interest not found" 
      });
    }

    if (interest.to.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to accept this interest" 
      });
    }

    if (interest.status === "accepted") {
      return res.status(400).json({ 
        success: false,
        message: "Interest already accepted" 
      });
    }

    // Update interest status
    interest.status = "accepted";
    await interest.save();

    // Check if match already exists
    let match = await Match.findOne({
      users: { $all: [interest.from, interest.to] }
    });

    if (!match) {
      // CREATE NEW MATCH with BOTH users in interestSentBy (mutual)
      match = await Match.create({
        users: [interest.from, interest.to],
        interestSentBy: [interest.from, interest.to] // ⭐ Both users now
      });
      console.log('✅ Mutual match created:', match._id);
    } else {
      // Add receiver to interestSentBy if not already there
      if (!match.interestSentBy.includes(interest.to)) {
        match.interestSentBy.push(interest.to);
        await match.save();
        console.log('✅ Match updated to mutual');
      }
    }

    res.json({
      success: true,
      message: "Interest accepted! You can now start messaging.",
      match
    });

  } catch (error) {
    console.error('Accept interest error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error accepting interest",
      error: error.message 
    });
  }
};

// REJECT INTEREST
export const rejectInterest = async (req, res) => {
  try {
    console.log('=== REJECT INTEREST ===');
    console.log('Interest ID:', req.params.id);

    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ 
        success: false,
        message: "Interest not found" 
      });
    }

    if (interest.to.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to reject this interest" 
      });
    }

    // Update interest status
    interest.status = "rejected";
    await interest.save();

    res.json({
      success: true,
      message: "Interest rejected",
      interest
    });

  } catch (error) {
    console.error('Reject interest error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error rejecting interest",
      error: error.message 
    });
  }
};

// ⭐ NEW: DELETE/CANCEL INTEREST
export const deleteInterest = async (req, res) => {
  try {
    console.log('=== DELETE INTEREST ===');
    console.log('Interest ID:', req.params.id);
    console.log('User ID:', req.user.id);

    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({ 
        success: false,
        message: "Interest not found" 
      });
    }

    // Only the sender can delete their interest
    if (interest.from.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to delete this interest" 
      });
    }

    await Interest.findByIdAndDelete(req.params.id);

    console.log('✅ Interest deleted');

    res.json({
      success: true,
      message: "Interest cancelled successfully"
    });

  } catch (error) {
    console.error('Delete interest error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error deleting interest",
      error: error.message 
    });
  }
};

// ========== NOTIFICATIONS ==========

// GET ALL NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    console.log('=== GET NOTIFICATIONS ===');
    console.log('User ID:', req.user.id);

    // Get all interests sent TO the current user
    const interests = await Interest.find({
      to: req.user.id
    })
      .populate('from', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Found interests:', interests.length);

    // Format notifications with profile info
    const notifications = await Promise.all(
      interests
        .filter(interest => interest.from) // ⭐ Filter out interests where sender was deleted
        .map(async (interest) => {
          const fromProfile = await Profile.findOne({ user: interest.from._id });

          return {
            _id: interest._id,
            type: 'interest',
            status: interest.status,
            from: {
              _id: interest.from._id,
              name: fromProfile?.fullName || interest.from.name || 'Unknown',
              email: interest.from.email,
              image: getImageUrl(fromProfile?.image, fromProfile?.gender),
              age: fromProfile?.age,
              city: fromProfile?.city,
              profession: fromProfile?.profession
            },
            message: `${fromProfile?.fullName || interest.from.name} sent you an interest`,
            createdAt: interest.createdAt,
            read: interest.status !== 'pending' // Mark as read if already accepted/rejected
          };
        })
    );

    // Count unread (pending) notifications
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching notifications",
      error: error.message 
    });
  }
};

// GET UNREAD COUNT
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Interest.countDocuments({
      to: req.user.id,
      status: 'pending'
    });

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error getting unread count",
      error: error.message 
    });
  }
};

// GET SENT INTERESTS (interests I sent to others)
export const getSentInterests = async (req, res) => {
  try {
    console.log('=== GET SENT INTERESTS ===');
    console.log('User ID:', req.user.id);

    const interests = await Interest.find({
      from: req.user.id
    })
      .populate('to', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Found sent interests:', interests.length);

    // Format with profile info
    const formatted = await Promise.all(
      interests
        .filter(interest => interest.to) // ⭐ Filter out interests where user was deleted
        .map(async (interest) => {
          const toProfile = await Profile.findOne({ user: interest.to._id });

          return {
            _id: interest._id,
            status: interest.status,
            to: {
              _id: interest.to._id,
              name: toProfile?.fullName || interest.to.name || 'Unknown',
              email: interest.to.email,
              image: getImageUrl(toProfile?.image, toProfile?.gender),
              age: toProfile?.age,
              city: toProfile?.city,
              profession: toProfile?.profession
            },
            createdAt: interest.createdAt
          };
        })
    );

    res.json({
      success: true,
      interests: formatted
    });

  } catch (error) {
    console.error('Get sent interests error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching sent interests",
      error: error.message 
    });
  }
};

// ========== SHORTLIST MANAGEMENT ==========

// Add to shortlist
export const addToShortlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    const userProfile = await Profile.findOne({ user: userId });
    
    if (!userProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Your profile not found' 
      });
    }

    if (!userProfile.shortlist) {
      userProfile.shortlist = [];
    }

    if (userProfile.shortlist.includes(profileId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Profile already in shortlist' 
      });
    }

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

// Remove from shortlist
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

// Get shortlisted profiles
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