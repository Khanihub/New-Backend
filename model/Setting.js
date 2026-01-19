import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  
  phone: String,
  dateOfBirth: String,
  gender: String,

  isActive: { type: Boolean, default: true },  // 👈 NEW - for deactivation

  privacySettings: {
    showProfile: { type: Boolean, default: true },
    showPhotos: { type: Boolean, default: true },
    showContact: { type: Boolean, default: false },
    allowMessages: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true }
  },

  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    newMatches: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    interests: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);