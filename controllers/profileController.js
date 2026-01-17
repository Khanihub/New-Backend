import Profile from "../model/Profile.js";

// CREATE PROFILE
export const createProfile = async (req, res) => {
  try {
    console.log('=== CREATE PROFILE REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', req.body);
    console.log('File:', req.file);
    
    // Check if profile already exists
    const exists = await Profile.findOne({ user: req.user.id });
    if (exists) {
      console.log('Profile already exists for user:', req.user.id);
      return res.status(400).json({ message: "Profile already exists" });
    }

    // Process the data
    const profileData = {
      user: req.user.id,
      fullName: req.body.fullName,
      gender: req.body.gender,
      age: req.body.age ? parseInt(req.body.age) : undefined,
      isMuslim: req.body.isMuslim === "true" || req.body.isMuslim === true,
      sect: req.body.sect || "",
      city: req.body.city,
      education: req.body.education,
      profession: req.body.profession || "",
      about: req.body.about || "",
      interests: req.body.interests || "",
      height: req.body.height ? parseInt(req.body.height) : null,
      genderPreference: req.body.genderPreference || 'opposite' // ADD THIS
    };

    if (req.file) {
      profileData.image = `/uploads/${req.file.filename}`;
    }

    console.log('Processed Profile Data:', profileData);

    // Validate required fields
    const requiredFields = ['fullName', 'gender', 'age', 'city', 'education'];
    for (const field of requiredFields) {
      if (!profileData[field] && profileData[field] !== 0) {
        console.log(`Missing required field: ${field}`);
        return res.status(400).json({ 
          message: `${field} is required`,
          field: field 
        });
      }
    }

    // Create profile
    const profile = await Profile.create(profileData);
    console.log('Profile created successfully:', profile._id);
    
    res.status(201).json(profile);
  } catch (err) {
    console.error("=== CREATE PROFILE ERROR ===");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    console.error("Error Stack:", err.stack);
    
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      console.log('Validation Errors:', messages);
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
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    console.log("=== UPDATE PROFILE STARTED ===");
    console.log("User ID from token:", req.user?.id);
    console.log("Request Body:", req.body);
    console.log("File:", req.file);
    
    if (!req.user || !req.user.id) {
      console.log("ERROR: No user found in request");
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    // Prepare update data
    const updateData = {
      fullName: req.body.fullName,
      gender: req.body.gender,
      age: parseInt(req.body.age) || undefined,
      city: req.body.city,
      education: req.body.education,
      profession: req.body.profession || '',
      interests: req.body.interests || '',
      about: req.body.about || '',
      height: parseInt(req.body.height) || undefined,
      isMuslim: req.body.isMuslim === "true" || req.body.isMuslim === true,
      sect: req.body.sect || '',
      genderPreference: req.body.genderPreference || 'opposite' // ADD THIS
    };
    
    // Add image if uploaded
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    console.log("Update data:", updateData);
    
    // Find existing profile
    let profile = await Profile.findOne({ user: req.user.id });
    
    if (profile) {
      console.log("Updating existing profile");
      // Update existing
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        updateData,
        { new: true, runValidators: true }
      );
    } else {
      console.log("Creating new profile");
      // Create new
      updateData.user = req.user.id;
      profile = await Profile.create(updateData);
    }
    
    console.log("Profile saved:", profile._id);
    
    res.json({
      success: true,
      message: "Profile saved successfully",
      profile: profile
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

// GET MY PROFILE
export const getMyProfile = async (req, res) => {
  try {
    console.log("Getting profile for user:", req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const profile = await Profile.findOne({ user: req.user.id });
    
    if (!profile) {
      console.log("Profile not found for user:", req.user.id);
      return res.status(404).json({ message: "Profile not found" });
    }
    
    console.log("Profile found:", profile._id);
    res.json(profile);
    
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      message: "Error fetching profile",
      error: error.message 
    });
  }
};

// DELETE PROFILE
export const deleteProfile = async (req, res) => {
  try {
    const profile = await Profile.findOneAndDelete({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET APPROVED PROFILES
export const getApprovedProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({ status: "approved" }).populate("user", "name");
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: update profile status
export const updateProfileStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const profile = await Profile.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};