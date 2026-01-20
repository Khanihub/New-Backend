import Match from "../model/Match.js";
import User from "../model/User.js";
import Profile from "../model/Profile.js";

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://i.pravatar.cc/400?img=1';
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

// Get all matches for current user (existing matches)
export const getMyMatches = async (req, res) => {
  try {
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

// ⭐ NEW: Get friends (mutual interests) for current user
export const getFriends = async (req, res) => {
  try {
    console.log('=== GET FRIENDS ===');
    console.log('User ID:', req.user.id);
    
    const currentUserId = req.user.id;

    // Find matches where BOTH users sent interest (mutual match = friends)
    const matches = await Match.find({
      users: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] } // Both users sent interest
    });

    console.log('Found mutual matches (friends):', matches.length);

    // Get friend profiles
    const friendProfiles = [];
    
    for (const match of matches) {
      const friendUserId = match.users.find(id => id.toString() !== currentUserId.toString());
      const profile = await Profile.findOne({ user: friendUserId }).populate('user', 'email');
      
      if (profile) {
        friendProfiles.push({
          id: profile._id,
          userId: profile.user._id,
          matchId: match._id, // ⭐ Include matchId for messaging
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
          isFriend: true // ⭐ Mark as friend
        });
      }
    }

    res.status(200).json({
      success: true,
      count: friendProfiles.length,
      friends: friendProfiles
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching friends', 
      error: error.message 
    });
  }
};

// Send interest to another user
export const sendInterest = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  try {
    console.log('=== SEND INTEREST ===');
    console.log('From:', senderId);
    console.log('To:', receiverId);

    let match = await Match.findOne({
      users: { $all: [senderId, receiverId] }
    });

    if (!match) {
      // Create new match
      match = await Match.create({
        users: [senderId, receiverId],
        interestSentBy: [senderId],
      });
      console.log('✅ New match created');
    } else if (!match.interestSentBy.includes(senderId)) {
      // Add sender to interestSentBy
      match.interestSentBy.push(senderId);
      await match.save();
      console.log('✅ Interest added to existing match');
    } else {
      console.log('⚠️ Interest already sent');
    }

    await match.populate("users", "name age image profession city");

    // Check if mutual (both sent interest)
    const isMutual = match.interestSentBy.length === 2;

    res.json({
      success: true,
      match: {
        ...match.toObject(),
        interestSent: true,
        isMutual: isMutual,
        status: isMutual ? 'friends' : 'pending'
      },
      message: isMutual ? 'You are now friends!' : 'Interest sent successfully'
    });
  } catch (err) {
    console.error('Send interest error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get potential matches to browse (EXCLUDE FRIENDS)
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

    // ⭐ Get all friends (mutual interests) to exclude them
    const friendMatches = await Match.find({
      users: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] }
    });
    
    const friendUserIds = friendMatches.map(match => 
      match.users.find(id => id.toString() !== currentUserId.toString())
    );

    console.log('Friends to exclude:', friendUserIds.length);

    // Build filter to exclude current user AND friends
    const filter = {
      user: { 
        $ne: currentUserId,
        $nin: friendUserIds // ⭐ Exclude friends from browse matches
      }
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

    console.log('Filter:', filter);

    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 });

    console.log('Found profiles:', profiles.length);

    // ⭐ Check interest status for each profile
    const formattedMatches = await Promise.all(
      profiles
        .filter(profile => profile.user)
        .map(async (profile) => {
          // Check if current user sent interest to this profile
          const existingMatch = await Match.findOne({
            users: { $all: [currentUserId, profile.user._id] }
          });

          const interestSent = existingMatch?.interestSentBy.includes(currentUserId) || false;
          const isMutual = existingMatch?.interestSentBy.length === 2 || false;

          return {
            id: profile._id,
            userId: profile.user._id,
            matchId: existingMatch?._id || null,
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
            interestSent: interestSent, // ⭐ Interest status
            isMutual: isMutual,
            status: isMutual ? 'friends' : (interestSent ? 'pending' : 'none')
          };
        })
    );

    console.log('Returning matches:', formattedMatches.length);

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

// Get filtered browse matches (EXCLUDE FRIENDS)
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

    // ⭐ Get friends to exclude
    const friendMatches = await Match.find({
      users: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] }
    });
    
    const friendUserIds = friendMatches.map(match => 
      match.users.find(id => id.toString() !== currentUserId.toString())
    );

    const filter = {
      user: { 
        $ne: currentUserId,
        $nin: friendUserIds // ⭐ Exclude friends
      }
    };

    // Apply gender filter
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

    const profiles = await Profile.find(filter)
      .populate('user', 'email')
      .limit(100)
      .sort({ createdAt: -1 });

    // ⭐ Check interest status
    const formattedMatches = await Promise.all(
      profiles
        .filter(profile => profile.user)
        .map(async (profile) => {
          const existingMatch = await Match.findOne({
            users: { $all: [currentUserId, profile.user._id] }
          });

          const interestSent = existingMatch?.interestSentBy.includes(currentUserId) || false;
          const isMutual = existingMatch?.interestSentBy.length === 2 || false;

          return {
            id: profile._id,
            userId: profile.user._id,
            matchId: existingMatch?._id || null,
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
            interestSent: interestSent,
            isMutual: isMutual,
            status: isMutual ? 'friends' : (interestSent ? 'pending' : 'none')
          };
        })
    );

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

    // Delete all messages in this match
    const Message = (await import("../model/Message.js")).default;
    await Message.deleteMany({ match: req.params.matchId });
    
    // Delete the match
    await Match.findByIdAndDelete(req.params.matchId);

    console.log('✅ Match and messages deleted successfully');

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