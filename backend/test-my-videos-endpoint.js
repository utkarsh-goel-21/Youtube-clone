const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function testMyVideosEndpoint() {
  try {
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Get pattagobhi user
    const user = await User.findOne({ username: 'pattagobhi' });
    if (!user) {
      console.log('User pattagobhi not found!');
      return;
    }

    console.log('Testing for user: pattagobhi');
    console.log('User ID:', user._id);
    console.log('');

    // Simulate the my-videos endpoint query
    console.log('=== SIMULATING /my-videos ENDPOINT ===');
    
    // This is exactly what the endpoint does
    const query = { 
      author: user._id,
      status: { $ne: 'deleted' }
    };
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    const videos = await Video.find(query)
      .populate('author', 'username channelName avatar isVerified')
      .sort({ uploadedAt: -1 });

    console.log(`\nFound ${videos.length} videos:\n`);
    
    videos.forEach((video, index) => {
      console.log(`${index + 1}. "${video.title}"`);
      console.log(`   ID: ${video._id}`);
      console.log(`   Status: ${video.status}`);
      console.log(`   isPublic: ${video.isPublic}`);
      console.log(`   Author: ${video.author.username}`);
      console.log('');
    });

    // Also test without status filter
    console.log('=== WITHOUT STATUS FILTER ===');
    const allVideos = await Video.find({ author: user._id });
    console.log(`Total videos for user: ${allVideos.length}`);
    
    // Check if any have different status
    const statusCounts = {};
    allVideos.forEach(v => {
      statusCounts[v.status || 'undefined'] = (statusCounts[v.status || 'undefined'] || 0) + 1;
    });
    console.log('Status breakdown:', statusCounts);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testMyVideosEndpoint();