// Test script to check notification data
// Run this in your backend: node testNotifications.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import your models
import Interest from './model/Interest.js';
import Match from './model/Match.js';
import Profile from './model/Profile.js';

const testNotifications = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Replace with your actual user ID to test
    const testUserId = 'YOUR_USER_ID_HERE';

    console.log('\n📊 === NOTIFICATION DEBUG INFO ===\n');

    // 1. Check Interests sent TO the user
    const interestsReceived = await Interest.find({ to: testUserId })
      .populate('from', 'email name')
      .sort({ createdAt: -1 });

    console.log(`1️⃣ Interests received (for notifications): ${interestsReceived.length}`);
    interestsReceived.forEach((interest, i) => {
      console.log(`   ${i + 1}. From: ${interest.from?.email} | Status: ${interest.status} | Created: ${interest.createdAt}`);
    });

    // 2. Check Matches where user hasn't responded
    const pendingMatches = await Match.find({
      users: testUserId,
      interestSentBy: { $ne: testUserId },
      $expr: { $eq: [{ $size: "$interestSentBy" }, 1] }
    });

    console.log(`\n2️⃣ Pending match requests: ${pendingMatches.length}`);
    for (const match of pendingMatches) {
      const otherUserId = match.users.find(id => id.toString() !== testUserId);
      const profile = await Profile.findOne({ user: otherUserId });
      console.log(`   - From: ${profile?.fullName || 'Unknown'} | Match ID: ${match._id}`);
    }

    // 3. Check Interests sent BY the user
    const interestsSent = await Interest.find({ from: testUserId })
      .populate('to', 'email name')
      .sort({ createdAt: -1 });

    console.log(`\n3️⃣ Interests sent: ${interestsSent.length}`);
    interestsSent.forEach((interest, i) => {
      console.log(`   ${i + 1}. To: ${interest.to?.email} | Status: ${interest.status}`);
    });

    // 4. Check all matches for this user
    const allMatches = await Match.find({ users: testUserId });
    
    console.log(`\n4️⃣ All matches: ${allMatches.length}`);
    allMatches.forEach((match, i) => {
      console.log(`   ${i + 1}. Match ID: ${match._id} | Interest sent by: ${match.interestSentBy.length} users`);
    });

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

testNotifications();