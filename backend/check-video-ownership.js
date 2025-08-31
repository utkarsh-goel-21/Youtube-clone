const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function checkVideoOwnership() {
  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Get all users
    const users = await User.find({}).select('username email channelName');
    console.log('=== ALL USERS ===');
    for (const user of users) {
      console.log(`User: ${user.username || user.email}`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Channel: ${user.channelName || 'N/A'}`);
    }

    // Get all videos with author info
    console.log('\n=== ALL VIDEOS WITH OWNERSHIP ===');
    const videos = await Video.find({}).populate('author', 'username email channelName');
    
    console.log(`Total videos: ${videos.length}\n`);
    
    for (const video of videos) {
      console.log(`Video: "${video.title}"`);
      console.log(`  ID: ${video._id}`);
      console.log(`  Author ID: ${video.author?._id || video.author}`);
      console.log(`  Author Name: ${video.author?.username || video.author?.email || 'Unknown'}`);
      console.log(`  Status: ${video.status}`);
      console.log(`  isPublic: ${video.isPublic}`);
      console.log(`  Uploaded: ${video.uploadedAt}`);
      console.log('');
    }

    // Count videos per user
    console.log('=== VIDEOS PER USER ===');
    for (const user of users) {
      const userVideoCount = await Video.countDocuments({ 
        author: user._id,
        status: { $ne: 'deleted' }
      });
      console.log(`${user.username || user.email} (${user._id}): ${userVideoCount} videos`);
    }

    // Test the my-videos query for each user
    console.log('\n=== TESTING MY-VIDEOS QUERY FOR EACH USER ===');
    for (const user of users) {
      const videos = await Video.find({ 
        author: user._id,
        status: { $ne: 'deleted' }
      }).select('title');
      
      console.log(`\n${user.username || user.email}:`);
      if (videos.length > 0) {
        videos.forEach(v => console.log(`  - ${v.title}`));
      } else {
        console.log('  No videos');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkVideoOwnership();