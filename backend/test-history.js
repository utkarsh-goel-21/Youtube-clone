const mongoose = require('mongoose');
const User = require('./models/User');
const Video = require('./models/Video');

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function testHistory() {
  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Find a user with watch history
    const users = await User.find({ 'watchHistory.0': { $exists: true } })
      .select('username email watchHistory')
      .limit(3);
    
    console.log(`Found ${users.length} users with watch history\n`);
    
    for (const user of users) {
      console.log(`User: ${user.username || user.email}`);
      console.log(`  Watch history items: ${user.watchHistory.length}`);
      
      if (user.watchHistory.length > 0) {
        console.log('  Recent watches:');
        const recentHistory = user.watchHistory.slice(0, 3);
        
        for (const item of recentHistory) {
          const video = await Video.findById(item.video).select('title status isPublic');
          if (video) {
            console.log(`    - ${video.title} (status: ${video.status}, public: ${video.isPublic})`);
            console.log(`      Watched at: ${item.watchedAt}`);
          } else {
            console.log(`    - Video ${item.video} not found or deleted`);
          }
        }
      }
      console.log('');
    }

    // Check if any users have empty watch history
    const usersWithoutHistory = await User.countDocuments({ 
      $or: [
        { watchHistory: { $exists: false } },
        { watchHistory: { $size: 0 } }
      ]
    });
    
    console.log(`Users without watch history: ${usersWithoutHistory}`);
    
    // Get total users
    const totalUsers = await User.countDocuments();
    console.log(`Total users: ${totalUsers}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testHistory();