import User from "../model/User.js";
import bcrypt from "bcryptjs";

// 👉 Get current user settings
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 👉 Update Profile Info
export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, dateOfBirth, gender } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        name: fullName,  // frontend se "fullName" aata hai
        email, 
        phone, 
        dateOfBirth, 
        gender 
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// 👉 Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Password update failed", error: error.message });
  }
};

// 👉 Update Privacy Settings
export const updatePrivacy = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { privacySettings: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "Privacy settings updated", 
      privacySettings: user.privacySettings 
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// 👉 Update Notification Settings
export const updateNotifications = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { notificationSettings: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "Notification settings updated", 
      notificationSettings: user.notificationSettings 
    });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

// 👉 Delete Account (NEW)
export const deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

// 👉 Deactivate Account (NEW)
export const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isActive: false },  // isActive field schema mein add karna hoga
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Account deactivated", user });
  } catch (error) {
    res.status(500).json({ message: "Deactivation failed", error: error.message });
  }
};