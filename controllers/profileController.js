// profileController.js - SAFER VERSION

import Profile from "../model/Profile.js";

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
    
    // Prepare update data - only include fields that exist
    const updateData = {};
    
    // Always update these basic fields
    if (req.body.fullName) updateData.fullName = req.body.fullName;
    if (req.body.gender) updateData.gender = req.body.gender;
    if (req.body.age) updateData.age = parseInt(req.body.age);
    if (req.body.city) updateData.city = req.body.city;
    if (req.body.education) updateData.education = req.body.education;
    
    // Optional fields
    if (req.body.profession !== undefined) updateData.profession = req.body.profession;
    if (req.body.interests !== undefined) updateData.interests = req.body.interests;
    if (req.body.about !== undefined) updateData.about = req.body.about;
    if (req.body.height) updateData.height = parseInt(req.body.height);
    if (req.body.sect !== undefined) updateData.sect = req.body.sect;
    
    // Boolean field
    updateData.isMuslim = req.body.isMuslim === "true" || req.body.isMuslim === true;
    
    // Gender preference - only add if provided
    if (req.body.genderPreference) {
      updateData.genderPreference = req.body.genderPreference;
    }
    
    // Add image if uploaded
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    
    console.log("Update data prepared:", updateData);
    
    // Validate required fields
    const requiredFields = ['fullName', 'gender', 'age', 'city', 'education'];
    for (const field of requiredFields) {
      if (!updateData[field] && updateData[field] !== 0) {
        return res.status(400).json({ 
          message: `${field} is required`,
          field: field 
        });
      }
    }
    
    // Find existing profile
    let profile = await Profile.findOne({ user: req.user.id });
    
    if (profile) {
      console.log("Updating existing profile:", profile._id);
      // Update existing
      Object.assign(profile, updateData);
      await profile.save();
    } else {
      console.log("Creating new profile");
      // Create new
      updateData.user = req.user.id;
      profile = await Profile.create(updateData);
    }
    
    console.log("Profile saved successfully:", profile._id);
    
    res.json({
      success: true,
      message: "Profile saved successfully",
      profile: profile
    });
    
  } catch (error) {
    console.error("=== UPDATE PROFILE ERROR ===");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    
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

// Keep createProfile the same
export const createProfile = async (req, res) => {
  try {
    console.log('=== CREATE PROFILE REQUEST ===');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', req.body);
    console.log('File:', req.file);
    
    const exists = await Profile.findOne({ user: req.user.id });
    if (exists) {
      console.log('Profile already exists, updating instead');
      // If profile exists, update it instead
      req.body.user = req.user.id;
      return updateProfile(req, res);
    }

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
      height: req.body.height ? parseInt(req.body.height) : null
    };
    
    // Only add genderPreference if it's provided
    if (req.body.genderPreference) {
      profileData.genderPreference = req.body.genderPreference;
    }

    if (req.file) {
      profileData.image = `/uploads/${req.file.filename}`;
    }

    console.log('Processed Profile Data:', profileData);

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

    const profile = await Profile.create(profileData);
    console.log('Profile created successfully:', profile._id);
    
    res.status(201).json(profile);
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

// Keep these the same
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
    res.json(profiles);
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
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};