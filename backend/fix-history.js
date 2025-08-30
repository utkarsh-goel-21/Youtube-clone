const mongoose = require('mongoose');
const User = require('./models/User');
const Video = require('./models/Video');

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function fixHistory() {
  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);
    
    // Get all valid video IDs
    const validVideos = await Video.find({ status: 'active' }).select('_id');
    const validVideoIds = new Set(validVideos.map(v => v._id.toString()));
    console.log(`Found ${validVideos.length} active videos\n`);
    
    for (const user of users) {
      if (user.watchHistory && user.watchHistory.length > 0) {
        console.log(`Processing ${user.username || user.email}...`);
        
        // Filter out invalid video IDs from watch history
        const originalCount = user.watchHistory.length;
        user.watchHistory = user.watchHistory.filter(item => 
          validVideoIds.has(item.video.toString())
        );
        
        const removedCount = originalCount - user.watchHistory.length;
        if (removedCount > 0) {
          console.log(`  Removed ${removedCount} invalid entries`);
          await user.save();
        } else {
          console.log(`  No invalid entries found`);
        }
      }
    }
    
    console.log('\nHistory cleanup complete!');
    
    // If there are valid videos, add the latest one to a test user's history
    if (validVideos.length > 0) {
      const latestVideo = await Video.findOne({ status: 'active' }).sort('-uploadedAt');
      const testUser = await User.findOne({});
      
      if (testUser && latestVideo) {
        // Check if video already in history
        const alreadyWatched = testUser.watchHistory.some(
          item => item.video.toString() === latestVideo._id.toString()
        );
        
        if (!alreadyWatched) {
          testUser.watchHistory.push({
            video: latestVideo._id,
            watchedAt: new Date(),
            duration: 30
          });
          await testUser.save();
          console.log(`\nAdded "${latestVideo.title}" to ${testUser.username}'s history for testing`);
        }
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixHistory();