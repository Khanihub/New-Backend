// MatchController.js - FIXED VERSION WITH NULL CHECKS

import Match from "../model/Match.js";
import User from "../model/User.js";
import Profile from "../model/Profile.js";

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://i.pravatar.cc/400?img=1';
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) return imagePath;
  
  // Determine base URL - prioritize environment variables
  const baseUrl = process.env.BACKEND_URL 
    || (process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.NODE_ENV === 'production'
        ? 'https://new-backend-production-766f.up.railway.app'
        : 'http://localhost:5000');
  
  // Ensure imagePath starts with /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  return `${baseUrl}${path}`;
};

// Get all matches for current user (existing matches)
export const getMyMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      users: { $in: [req.user.id] }
    })
      .populate("users", "name age image profession city")
      .lean();

    // 👇 FILTER OUT NULL USERS
    const validMatches = matches.filter(match => 
      match.users && 
      match.users.length === 2 &&
      match.users[0] && 
      match.users[1]
    );

    const formatted = validMatches.map(match => {
      const otherUser = match.users.find(u => u._id.toString() !== req.user.id);
      
      if (!otherUser) return null;
      
      return {
        ...match,
        interestSent: match.interestSentBy.includes(req.user.id),
        otherUser: {
          ...otherUser,
          image: getImageUrl(otherUser.image)
        }
      };
    }).filter(Boolean); // Remove nulls

    res.json(formatted);
  } catch (err) {
    console.error('Get My Matches Error:', err);
    res.status(500).json({ message: "Failed to fetch matches" });
  }
};

// Send interest to another user
export const sendInterest = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  try {
    // 👇 VERIFY RECEIVER EXISTS
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ message: "User not found" });
    }

    let match = await Match.findOne({
      users: { $all: [senderId, receiverId] }
    });

    if (!match) {
      match = await Match.create({
        users: [senderId, receiverId],
        interestSentBy: [senderId],
      });
    } else if (!match.interestSentBy.includes(senderId)) {
      match.interestSentBy.push(senderId);
      await match.save();
    }
    
    await match.populate("users", "name age image profession city");

    res.json({
      ...match.toObject(),
      interestSent: match.interestSentBy.includes(senderId)
    });
  } catch (err) {
    console.error('Send Interest Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get potential matches to browse
export const getBrowseMatches = async (req, res) => {
  try {
    console.log('=== GET BROWSE MATCHES ===');
    console.log('User ID:', req.user.id);
    
    const currentUserId = req.user.id;

    // Get current user's profile
    const currentUserProfile = await Profile.findOne({ user: currentUserId });
    
    if (!currentUserProfile) {
      console.log('No profile found for user:', currentUserId);
      return res.status(404).json({ 
        success: false, 
        message: 'Please complete your profile first' 
      });
    }

    console.log('Current user profile:', {
      gender: currentUserProfile.gender,
      preference: currentUserProfile.genderPreference || 'opposite'
    });

    // Build filter to exclude current user
    const filter = {
      user: { $ne: currentUserId }
    };

    // Apply gender filter based on preference
    const preference = currentUserProfile.genderPreference || 'opposite';
    
    if (preference === 'opposite') {
      // Show opposite gender only
      if (currentUserProfile.gender === 'male') {
        filter.gender = 'female';
      } else if (currentUserProfile.gender === 'female') {
        filter.gender = 'male';
      }
    } else if (preference === 'same') {
      // Show same gender only
      filter.gender = currentUserProfile.gender;
    }
    // If preference is 'all', don't add gender filter (show everyone)

    console.log('Filter:', filter);

    // Get all matching profiles
    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 })
      .lean(); // 👈 Use lean for better performance

    console.log('Found profiles:', profiles.length);

    // 👇 CRITICAL: FILTER OUT PROFILES WITH NULL/MISSING USER
    const validProfiles = profiles.filter(profile => {
      // Check if profile has valid user reference
      if (!profile || !profile.user) {
        console.warn('⚠️ Profile without user found:', profile?._id);
        return false;
      }
      
      // Check if user object has _id
      if (!profile.user._id) {
        console.warn('⚠️ User without _id found in profile:', profile._id);
        return false;
      }

      return true;
    });

    console.log('Valid profiles after filtering:', validProfiles.length);

    // Format for frontend with proper image URLs
    const formattedMatches = validProfiles.map(profile => {
      try {
        return {
          id: profile._id.toString(),
          userId: profile.user._id.toString(),
          name: profile.fullName || 'Unknown',
          age: profile.age || 0,
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
        };
      } catch (error) {
        console.error('Error formatting profile:', profile._id, error);
        return null;
      }
    }).filter(Boolean); // Remove any nulls from failed formatting

    console.log('Returning matches:', formattedMatches.length);
    if (formattedMatches.length > 0) {
      console.log('Sample match:', formattedMatches[0]);
    }

    res.status(200).json({
      success: true,
      count: formattedMatches.length,
      matches: formattedMatches
    });

  } catch (error) {
    console.error('=== GET BROWSE MATCHES ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching matches', 
      error: error.message 
    });
  }
};

// Get filtered browse matches
export const getFilteredBrowseMatches = async (req, res) => {
  try {
    console.log('=== GET FILTERED BROWSE MATCHES ===');
    const currentUserId = req.user.id;
    const { minAge, maxAge, religion, location, education, profession } = req.query;

    const currentUserProfile = await Profile.findOne({ user: currentUserId });
    
    if (!currentUserProfile) {
      return res.status(404).json({ 
        success: false, 
        message: 'Please complete your profile first' 
      });
    }

    const filter = {
      user: { $ne: currentUserId }
    };

    // Apply gender filter based on preference
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
    // If 'all', no gender filter

    // Age filter
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = parseInt(minAge);
      if (maxAge) filter.age.$lte = parseInt(maxAge);
    }

    // Religion filter
    if (religion === 'Muslim') {
      filter.isMuslim = true;
    }

    // Location filter
    if (location) {
      filter.city = { $regex: location, $options: 'i' };
    }

    // Education filter
    if (education) {
      filter.education = { $regex: education, $options: 'i' };
    }

    // Profession filter
    if (profession) {
      filter.profession = { $regex: profession, $options: 'i' };
    }

    console.log('Filter applied:', filter);

    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 })
      .lean();

    // 👇 FILTER OUT NULL USERS
    const validProfiles = profiles.filter(profile => 
      profile && profile.user && profile.user._id
    );

    const formattedMatches = validProfiles.map(profile => {
      try {
        return {
          id: profile._id.toString(),
          userId: profile.user._id.toString(),
          name: profile.fullName || 'Unknown',
          age: profile.age || 0,
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
        };
      } catch (error) {
        console.error('Error formatting profile:', profile._id, error);
        return null;
      }
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      count: formattedMatches.length,
      matches: formattedMatches
    });

  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching filtered matches', 
      error: error.message 
    });
  }
};

export const deleteMatch = async (req, res) => {
  try {
    console.log('=== DELETE MATCH ===');
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
        message: 'Not authorized to delete this match' 
      });
    }

    // Import Message model if needed
    // await Message.deleteMany({ match: req.params.matchId });
    
    // Delete the match
    await Match.findByIdAndDelete(req.params.matchId);

    console.log('✅ Match deleted successfully');

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting match',
      error: error.message 
    });
  }
};