import User from "../model/User.js";
import bcrypt from "bcryptjs";

// 👉 Get current user settings
export const getSettings = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

// 👉 Update Profile Info
export const updateProfile = async (req, res) => {
  const { name, email, phone, dateOfBirth, gender } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, email, phone, dateOfBirth, gender },
    { new: true }
  );

  res.json({ message: "Profile updated", user });
};

// 👉 Change Password
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(400).json({ message: "Old password wrong" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password updated successfully" });
};

// 👉 Update Privacy
export const updatePrivacy = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { privacySettings: req.body },
    { new: true }
  );

  res.json({ message: "Privacy settings updated", privacySettings: user.privacySettings });
};

// 👉 Update Notifications
export const updateNotifications = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { notificationSettings: req.body },
    { new: true }
  );

  res.json({ message: "Notification settings updated", notificationSettings: user.notificationSettings });
};
