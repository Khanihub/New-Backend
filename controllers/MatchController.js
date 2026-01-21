import Match from "../model/Match.js";
import Interest from "../model/Interest.js";
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

// ⭐ Get friend requests (people who sent interest to you, but you haven't responded)
export const getFriendRequests = async (req, res) => {
  try {
    console.log('=== GET FRIEND REQUESTS ===');
    console.log('User ID:', req.user.id);
    
    const currentUserId = req.user.id;

    // Find matches where other user sent interest but current user hasn't
    const matches = await Match.find({
      users: currentUserId,
      interestSentBy: { $ne: currentUserId },
      $expr: { $eq: [{ $size: "$interestSentBy" }, 1] }
    });

    console.log('Found pending requests:', matches.length);

    const requestProfiles = [];
    
    for (const match of matches) {
      const requesterUserId = match.users.find(id => id.toString() !== currentUserId.toString());
      
      if (match.interestSentBy.includes(requesterUserId)) {
        const profile = await Profile.findOne({ user: requesterUserId }).populate('user', 'email');
        
        if (profile) {
          requestProfiles.push({
            id: profile._id,
            userId: profile.user._id,
            matchId: match._id,
            name: profile.fullName,
            age: profile.age,
            profession: profile.profession || 'Not specified',
            location: profile.city || 'Location not specified',
            image: getImageUrl(profile.image),
            sentAt: match.createdAt
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      count: requestProfiles.length,
      requests: requestProfiles
    });

  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching friend requests', 
      error: error.message 
    });
  }
};

// ⭐ Get friends (mutual interests)
export const getFriends = async (req, res) => {
  try {
    console.log('=== GET FRIENDS ===');
    console.log('User ID:', req.user.id);
    
    const currentUserId = req.user.id;

    const matches = await Match.find({
      users: currentUserId,
      interestSentBy: currentUserId,
      $expr: { $eq: [{ $size: "$interestSentBy" }, 2] }
    });

    console.log('Found mutual matches (friends):', matches.length);

    const friendProfiles = [];
    
    for (const match of matches) {
      const friendUserId = match.users.find(id => id.toString() !== currentUserId.toString());
      const profile = await Profile.findOne({ user: friendUserId }).populate('user', 'email');
      
      if (profile) {
        friendProfiles.push({
          id: profile._id,
          userId: profile.user._id,
          matchId: match._id,
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
          isFriend: true
        });
      }
    }

    console.log('Returning friends:', friendProfiles.length);

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

// ⭐⭐⭐ FIXED: Send interest - Creates BOTH Match AND Interest with proper notification
export const sendInterest = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  try {
    console.log('=== SEND INTEREST ===');
    console.log('From:', senderId);
    console.log('To:', receiverId);

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to yourself'
      });
    }

    // ⭐ STEP 1: Check/Create Interest document (for notifications)
    let interest = await Interest.findOne({
      from: senderId,
      to: receiverId
    });

    if (!interest) {
      // Create new interest for notification system
      interest = await Interest.create({
        from: senderId,
        to: receiverId,
        status: 'pending'
      });
      console.log('✅ Interest created for notifications:', interest._id);
    } else {
      console.log('⚠️ Interest already exists:', interest._id);
    }

    // ⭐ STEP 2: Check/Create Match document (for matching system)
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
      console.log('✅ Interest added to existing match');
      
      // ⭐ CRITICAL FIX: Check if this makes it mutual (both sent interest)
      if (match.interestSentBy.length === 2) {
        // Update BOTH interest documents to "accepted"
        await Interest.updateMany(
          {
            $or: [
              { from: senderId, to: receiverId },
              { from: receiverId, to: senderId }
            ]
          },
          { status: 'accepted' }
        );
        console.log('✅ Both interests marked as accepted (mutual match)');
      }
    } else {
      // Interest already sent by this user
      return res.json({
        success: true,
        match: {
          ...match.toObject(),
          interestSent: true,
          isMutual: match.interestSentBy.length === 2,
          status: match.interestSentBy.length === 2 ? 'friends' : 'pending'
        },
        message: 'Interest already sent'
      });
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
    console.error('Send interest error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
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
      .sort({ createdAt: -1 });

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
    console.error('Browse matches error:', error);
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

    const profiles = await Profile.find(filter).populate('user', 'email').limit(100).sort({ createdAt: -1 });

    const formattedMatches = await Promise.all(
      profiles.filter(profile => profile.user).map(async (profile) => {
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
          interestSent, isMutual,
          status: isMutual ? 'friends' : (interestSent ? 'pending' : 'none')
        };
      })
    );

    res.status(200).json({ success: true, count: formattedMatches.length, matches: formattedMatches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching filtered matches', error: error.message });
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

    // Delete all messages in this conversation
    const Message = (await import("../model/Message.js")).default;
    await Message.deleteMany({ match: req.params.matchId });
    console.log('✅ Messages deleted');

    // Delete the match
    await Match.findByIdAndDelete(req.params.matchId);
    console.log('✅ Match deleted');

    // Update both interest documents to "rejected" or delete them
    await Interest.updateMany(
      {
        $or: [
          { from: req.user.id, to: otherUserId },
          { from: otherUserId, to: req.user.id }
        ]
      },
      { status: 'rejected' }
    );
    console.log('✅ Interests updated to rejected');

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

export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (!match.users.includes(req.user.id)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const Message = (await import("../model/Message.js")).default;
    await Message.deleteMany({ match: req.params.matchId });
    await Match.findByIdAndDelete(req.params.matchId);

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting match', error: error.message });
  }
};