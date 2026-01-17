// ProfileController.js - COMPLETE UPDATED VERSION

import Profile from "../model/Profile.js";

// ✅ Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://i.pravatar.cc/400?img=1';
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) return imagePath;
  
  // Determine base URL based on environment
  let baseUrl;
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    // Railway production
    baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  } else if (process.env.BACKEND_URL) {
    // Custom backend URL from env
    baseUrl = process.env.BACKEND_URL;
  } else if (process.env.NODE_ENV === 'production') {
    // Fallback production URL
    baseUrl = 'https://new-backend-production-766f.up.railway.app';
  } else {
    // Local development
    baseUrl = 'http://localhost:5000';
  }
  
  return `${baseUrl}${imagePath}`;
};

export const createProfile = async (req, res) => {
  try {
    console.log('=== CREATE PROFILE REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', req.body);
    console.log('File:', req.file);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const exists = await Profile.findOne({ user: req.user.id });
    if (exists) {
      console.log('Profile already exists, updating instead');
      return updateProfile(req, res);
    }

    const {
      fullName,
      gender,
      age,
      isMuslim,
      sect,
      city,
      education,
      profession,
      about,
      interests,
      height,
      genderPreference
    } = req.body;

    console.log('Extracted fields:', { fullName, gender, age, city, education });

    if (!fullName || !gender || !age || !city || !education) {
      const missing = [];
      if (!fullName) missing.push('fullName');
      if (!gender) missing.push('gender');
      if (!age) missing.push('age');
      if (!city) missing.push('city');
      if (!education) missing.push('education');
      
      console.log('Missing required fields:', missing);
      return res.status(400).json({ 
        message: `Missing required fields: ${missing.join(', ')}`,
        missingFields: missing
      });
    }

    const profileData = {
      user: req.user.id,
      fullName: fullName.trim(),
      gender: gender.trim(),
      age: parseInt(age),
      isMuslim: isMuslim === "true" || isMuslim === true,
      sect: sect || "",
      city: city.trim(),
      education: education.trim(),
      profession: profession || "",
      about: about || "",
      interests: interests || "",
      height: height ? parseInt(height) : null,
      genderPreference: genderPreference || 'opposite'
    };

    if (req.file) {
      profileData.image = `/uploads/${req.file.filename}`;
      console.log('Image uploaded:', profileData.image);
    }

    console.log('Creating profile with data:', profileData);

    const profile = await Profile.create(profileData);
    console.log('Profile created successfully:', profile._id);
    
    // Convert to object and update image URL
    const profileResponse = profile.toObject();
    if (profileResponse.image) {
      profileResponse.image = getImageUrl(profileResponse.image);
    }
    
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile: profileResponse
    });

  } catch (err) {
    console.error("=== CREATE PROFILE ERROR ===");
    console.error("Error:", err);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: messages 
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'Profile already exists for this user' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error occurred while creating profile',
      error: err.message 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    console.log("=== UPDATE PROFILE STARTED ===");
    console.log("User ID:", req.user?.id);
    console.log("Request Body:", req.body);
    console.log("File:", req.file);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const {
      fullName,
      gender,
      age,
      isMuslim,
      sect,
      city,
      education,
      profession,
      about,
      interests,
      height,
      genderPreference
    } = req.body;

    if (!fullName || !gender || !age || !city || !education) {
      const missing = [];
      if (!fullName) missing.push('fullName');
      if (!gender) missing.push('gender');
      if (!age) missing.push('age');
      if (!city) missing.push('city');
      if (!education) missing.push('education');
      
      return res.status(400).json({ 
        message: `Missing required fields: ${missing.join(', ')}`,
        missingFields: missing
      });
    }
    
    const updateData = {
      fullName: fullName.trim(),
      gender: gender.trim(),
      age: parseInt(age),
      city: city.trim(),
      education: education.trim(),
      profession: profession || '',
      interests: interests || '',
      about: about || '',
      height: height ? parseInt(height) : null,
      isMuslim: isMuslim === "true" || isMuslim === true,
      sect: sect || '',
      genderPreference: genderPreference || 'opposite'
    };
    
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      console.log('New image uploaded:', updateData.image);
    }
    
    console.log("Update data prepared:", updateData);
    
    let profile = await Profile.findOne({ user: req.user.id });
    
    if (profile) {
      console.log("Updating existing profile:", profile._id);
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      console.log("Creating new profile");
      updateData.user = req.user.id;
      profile = await Profile.create(updateData);
    }
    
    console.log("Profile saved successfully:", profile._id);
    
    // Convert to object and update image URL
    const profileResponse = profile.toObject();
    if (profileResponse.image) {
      profileResponse.image = getImageUrl(profileResponse.image);
    }
    
    res.json({
      success: true,
      message: "Profile saved successfully",
      profile: profileResponse
    });
    
  } catch (error) {
    console.error("=== UPDATE PROFILE ERROR ===");
    console.error("Error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate profile found" 
      });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    console.log("Getting profile for user:", req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const profile = await Profile.findOne({ user: req.user.id });
    
    if (!profile) {
      console.log("Profile not found for user:", req.user.id);
      return res.status(404).json({ 
        message: "Profile not found",
        needsProfile: true
      });
    }
    
    console.log("Profile found:", profile._id);
    
    // Convert to object and update image URL
    const profileResponse = profile.toObject();
    if (profileResponse.image) {
      profileResponse.image = getImageUrl(profileResponse.image);
    }
    
    res.json(profileResponse);
    
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      message: "Error fetching profile",
      error: error.message 
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOneAndDelete({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getApprovedProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ status: "approved" }).populate("user", "name");
    
    // Update image URLs for all profiles
    const profilesWithImages = profiles.map(profile => {
      const profileObj = profile.toObject();
      if (profileObj.image) {
        profileObj.image = getImageUrl(profileObj.image);
      }
      return profileObj;
    });
    
    res.json(profilesWithImages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfileStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!profile) return res.status(404).json({ message: "Profile not found" });
    
    // Update image URL
    const profileResponse = profile.toObject();
    if (profileResponse.image) {
      profileResponse.image = getImageUrl(profileResponse.image);
    }
    
    res.json(profileResponse);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};