// MatchController.js - FIXED VERSION WITH PROPER IMAGE URLS

import Match from "../model/Match.js";
import Interest from "../model/Interest.js";
import User from "../model/User.js";
import Profile from "../model/Profile.js";

// Helper function to get correct image URL
const getImageUrl = (imagePath, gender = null) => {
  // If no image path provided, return gender-based default
  if (!imagePath) {
    if (gender === 'male') {
      return '/assets/Male Pic.png';
    } else if (gender === 'female') {
      return '/assets/Female pic.png';
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

// ⭐ Get friend requests (people who sent interest to you, but you haven't responded)
export const getFriendRequests = async (req, res) => {
  try {
    console.log('=== GET FRIEND REQUESTS ===');
    console.log('User ID:', req.user.id);
    
    const currentUserId = req.user.id;

    // Find matches where other user sent interest but current user hasn't
    const matches = await Match.find({
      users: { $in: [req.user.id] }
    })
      .populate("users", "name age image profession city")
      .lean();

    const formatted = matches.map(match => {
      const otherUser = match.users.find(u => u._id.toString() !== req.user.id);
      return {
        ...match,
        interestSent: match.interestSentBy.includes(req.user.id),
        otherUser: {
          ...otherUser,
          image: getImageUrl(otherUser.image)
        }
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch matches" });
  }
};

// ⭐⭐⭐ FIXED: Send interest - Creates BOTH Match AND Interest with proper notification
export const sendInterest = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  try {
    let match = await Match.findOne({
      users: { $all: [senderId, receiverId] }
    });

    if (!match) {
      match = await Match.create({
        users: [senderId, receiverId],
        interestSentBy: [senderId],
      });
      console.log('✅ New match created:', match._id);
    } else if (!match.interestSentBy.includes(senderId)) {
      match.interestSentBy.push(senderId);
      await match.save();
    }
    await match.populate("users", "name age image profession city");

    const isMutual = match.interestSentBy.length === 2;

    res.json({
      success: true,
      match: {
        ...match.toObject(),
        interestSent: true,
        isMutual: isMutual,
        status: isMutual ? 'friends' : 'pending'
      },
      interest: interest, // ⭐ Also return the interest for frontend tracking
      message: isMutual ? 'You are now friends! 💝' : 'Interest sent successfully! ⏳'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ⭐ NEW: Remove interest from match (for canceling requests)
export const removeInterestFromMatch = async (req, res) => {
  try {
    console.log('=== REMOVE INTEREST FROM MATCH ===');
    console.log('Match ID:', req.params.matchId);
    console.log('User ID:', req.user.id);

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Remove user from interestSentBy array
    match.interestSentBy = match.interestSentBy.filter(
      userId => userId.toString() !== req.user.id
    );

    // If no one has sent interest anymore, delete the match
    if (match.interestSentBy.length === 0) {
      await Match.findByIdAndDelete(req.params.matchId);
      console.log('✅ Match deleted (no interests left)');
      
      return res.json({
        success: true,
        message: 'Request cancelled and match deleted'
      });
    }

    // Otherwise, just update the match
    await match.save();
    console.log('✅ Interest removed from match');

    res.json({
      success: true,
      message: 'Interest removed from match',
      match
    });

  } catch (error) {
    console.error('Remove interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing interest',
      error: error.message
    });
  }
};

// Get browse matches
export const getBrowseMatches = async (req, res) => {
  try {
    console.log('=== GET BROWSE MATCHES ===');
    const currentUserId = req.user.id;

    const currentUserProfile = await Profile.findOne({ user: currentUserId });
    
    if (!currentUserProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Please complete your profile first' 
      });
    }

    const friendMatches = await Match.find({
      users: currentUserId,
      interestSentBy: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] }
    });
    
    const friendUserIds = friendMatches.map(match => 
      match.users.find(id => id.toString() !== currentUserId.toString())
    );

    const filter = {
      user: { 
        $ne: currentUserId,
        $nin: friendUserIds
      }
    };

    const preference = currentUserProfile.genderPreference || 'opposite';
    
    if (preference === 'opposite') {
      if (currentUserProfile.gender === 'male') {
        filter.gender = 'female';
      } else if (currentUserProfile.gender === 'female') {
        filter.gender = 'male';
      }
    } else if (preference === 'same') {
      filter.gender = currentUserProfile.gender;
    }

    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 })
      .lean(); // 👈 Use lean for better performance

    console.log('Found profiles:', profiles.length);

    // Format for frontend with proper image URLs
    const formattedMatches = profiles.map(profile => ({
      id: profile._id,
      userId: profile.user._id,
      name: profile.fullName,
      age: profile.age,
      profession: profile.profession || 'Not specified',
      location: profile.city || 'Location not specified',
      education: profile.education || 'Not specified',
      religion: profile.isMuslim ? 'Muslim' : 'Not specified',
      height: profile.height ? `${profile.height} cm` : 'Not specified',
      maritalStatus: 'Never Married',
      about: profile.about || 'No description provided',
      interests: profile.interests ? 
        (Array.isArray(profile.interests) ? profile.interests : 
         profile.interests.split(',').map(i => i.trim())) : [],
      image: getImageUrl(profile.image),
      verified: true,
      online: false,
    }));

    console.log('Returning matches:', formattedMatches.length);
    console.log('Sample image URL:', formattedMatches[0]?.image);

    res.status(200).json({
      success: true,
      count: formattedMatches.length,
      matches: formattedMatches
    });

  } catch (error) {
    console.error('=== GET BROWSE MATCHES ERROR ===');
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching matches', 
      error: error.message 
    });
  }
};

// Other exports
export const getMyMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      users: { $in: [req.user.id] }
    }).populate("users", "name age image profession city").lean();

    const formatted = matches.map(match => {
      const otherUser = match.users.find(u => u._id.toString() !== req.user.id);
      return {
        ...match,
        interestSent: match.interestSentBy.includes(req.user.id),
        otherUser: { ...otherUser, image: getImageUrl(otherUser.image) }
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch matches" });
  }
};

export const getFilteredBrowseMatches = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { minAge, maxAge, religion, location, education, profession } = req.query;

    const currentUserProfile = await Profile.findOne({ user: currentUserId });
    
    if (!currentUserProfile) {
      return res.status(404).json({ success: false, message: 'Please complete your profile first' });
    }

    const friendMatches = await Match.find({
      users: currentUserId,
      interestSentBy: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] }
    });
    
    const friendUserIds = friendMatches.map(match => 
      match.users.find(id => id.toString() !== currentUserId.toString())
    );

    const filter = {
      user: { $ne: currentUserId, $nin: friendUserIds }
    };

    const preference = currentUserProfile.genderPreference || 'opposite';
    if (preference === 'opposite') {
      if (currentUserProfile.gender === 'male') filter.gender = 'female';
      else if (currentUserProfile.gender === 'female') filter.gender = 'male';
    } else if (preference === 'same') {
      filter.gender = currentUserProfile.gender;
    }

    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = parseInt(minAge);
      if (maxAge) filter.age.$lte = parseInt(maxAge);
    }

    if (religion === 'Muslim') filter.isMuslim = true;
    if (location) filter.city = { $regex: location, $options: 'i' };
    if (education) filter.education = { $regex: education, $options: 'i' };
    if (profession) filter.profession = { $regex: profession, $options: 'i' };

    console.log('Filter applied:', filter);

    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 });

    const formattedMatches = profiles.map(profile => ({
      id: profile._id,
      userId: profile.user._id,
      name: profile.fullName,
      age: profile.age,
      profession: profile.profession || 'Not specified',
      location: profile.city || 'Location not specified',
      education: profile.education || 'Not specified',
      religion: profile.isMuslim ? 'Muslim' : 'Not specified',
      height: profile.height ? `${profile.height} cm` : 'Not specified',
      maritalStatus: 'Never Married',
      about: profile.about || 'No description provided',
      interests: profile.interests ? 
        (Array.isArray(profile.interests) ? profile.interests : 
         profile.interests.split(',').map(i => i.trim())) : [],
      image: getImageUrl(profile.image),
      verified: true,
      online: false,
    }));

    res.status(200).json({ success: true, count: formattedMatches.length, matches: formattedMatches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching filtered matches', error: error.message });
  }
};

// ⭐ NEW: Cancel interest by userId - Simplified version
export const cancelInterestByUserId = async (req, res) => {
  try {
    console.log('=== CANCEL INTEREST BY USER ID ===');
    console.log('Target User ID:', req.params.userId);
    console.log('Current User ID:', req.user.id);

    const senderId = req.user.id;
    const receiverId = req.params.userId;

    // STEP 1: Find and delete the Interest document
    const interest = await Interest.findOneAndDelete({
      from: senderId,
      to: receiverId,
      status: 'pending' // Only delete pending interests
    });

    if (interest) {
      console.log('✅ Interest deleted:', interest._id);
    } else {
      console.log('⚠️ No pending interest found');
    }

    // STEP 2: Find and update the Match document
    const match = await Match.findOne({
      users: { $all: [senderId, receiverId] }
    });

    if (match) {
      // Remove sender from interestSentBy array
      match.interestSentBy = match.interestSentBy.filter(
        userId => userId.toString() !== senderId
      );

      // If no interests left, delete the match
      if (match.interestSentBy.length === 0) {
        await Match.findByIdAndDelete(match._id);
        console.log('✅ Match deleted (no interests left)');
      } else {
        await match.save();
        console.log('✅ Interest removed from match');
      }
    }

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling request',
      error: error.message
    });
  }
};

// ⭐ NEW: Unfriend - Remove friend connection
export const unfriend = async (req, res) => {
  try {
    console.log('=== UNFRIEND ===');
    console.log('Match ID:', req.params.matchId);
    console.log('User ID:', req.user.id);

    const match = await Match.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if user is part of this match
    if (!match.users.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get the other user's ID
    const otherUserId = match.users.find(
      id => id.toString() !== req.user.id
    );

    // Delete all messages in this match
    await Message.deleteMany({ match: req.params.matchId });
    
    // Delete the match
    await Match.findByIdAndDelete(req.params.matchId);

    console.log('✅ Match and messages deleted successfully');

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing friend',
      error: error.message
    });
  }
};
