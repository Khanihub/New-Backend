// D:\Dating App\backend-main\model\Profile.js

import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: { type: String, required: true },
  gender: { type: String, required: true },
  age: { type: Number, required: true, min: 18 },
  isMuslim: { type: Boolean, default: true },
  sect: String,
  city: { type: String, required: true },
  education: { type: String, required: true },
  interests: String,
  about: String,
  height: Number,
  profession: String,
  image: String,
  
  // ADD THIS NEW FIELD
  genderPreference: {
    type: String,
    enum: ['opposite', 'same', 'all'],
    default: 'opposite'
  },
  
  shortlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  }],
  
  maritalStatus: String,
  verified: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Profile', profileSchema);