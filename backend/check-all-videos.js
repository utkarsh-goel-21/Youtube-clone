const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User'); // Need to load User model too

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function checkAllVideos() {
  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Get ALL videos without any filters
    const allVideos = await Video.find({}).populate('author', 'username channelName');
    console.log(`=== TOTAL VIDEOS IN DATABASE: ${allVideos.length} ===\n`);
    
    for (const video of allVideos) {
      console.log(`Video: "${video.title}"`);
      console.log(`  ID: ${video._id}`);
      console.log(`  Status: ${video.status}`);
      console.log(`  isPublic: ${video.isPublic}`);
      console.log(`  Author: ${video.author?.username || video.author?.channelName || video.author}`);
      console.log(`  Uploaded: ${video.uploadedAt}`);
      console.log(`  Views: ${video.views}`);
      console.log('');
    }

    // Check different query results
    console.log('=== QUERY RESULTS ===');
    
    const activePublic = await Video.countDocuments({ status: 'active', isPublic: true });
    console.log(`Videos with status='active' AND isPublic=true: ${activePublic}`);
    
    const justActive = await Video.countDocuments({ status: 'active' });
    console.log(`Videos with status='active': ${justActive}`);
    
    const justPublic = await Video.countDocuments({ isPublic: true });
    console.log(`Videos with isPublic=true: ${justPublic}`);
    
    const noFilters = await Video.countDocuments({});
    console.log(`Videos with NO filters: ${noFilters}`);

    // Check for specific user's videos
    const userVideos = await Video.aggregate([
      { $group: { _id: '$author', count: { $sum: 1 } } }
    ]);
    
    console.log('\n=== VIDEOS PER USER ===');
    for (const userCount of userVideos) {
      console.log(`User ${userCount._id}: ${userCount.count} videos`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAllVideos();