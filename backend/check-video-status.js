const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

async function checkVideoStatus() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-clone';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Count total videos
    const totalVideos = await Video.countDocuments();
    console.log('\n=== TOTAL VIDEOS IN DATABASE: ' + totalVideos + ' ===\n');

    // Check videos by status
    const activeVideos = await Video.countDocuments({ status: 'active' });
    const publicVideos = await Video.countDocuments({ isPublic: true });
    const activePublicVideos = await Video.countDocuments({ status: 'active', isPublic: true });
    
    console.log('Videos with status="active": ' + activeVideos);
    console.log('Videos with isPublic=true: ' + publicVideos);
    console.log('Videos with both status="active" AND isPublic=true: ' + activePublicVideos);

    // Check videos without status field
    const noStatusVideos = await Video.countDocuments({ status: { $exists: false } });
    console.log('Videos WITHOUT status field: ' + noStatusVideos);

    // Check videos with status != 'deleted'
    const notDeletedVideos = await Video.countDocuments({ status: { $ne: 'deleted' } });
    console.log('Videos with status != "deleted": ' + notDeletedVideos);

    // Get sample of videos to see their actual status values
    console.log('\n=== SAMPLE OF FIRST 5 VIDEOS ===');
    const sampleVideos = await Video.find().limit(5).select('title status isPublic author uploadedAt');
    sampleVideos.forEach((video, index) => {
      console.log(`\nVideo ${index + 1}:`);
      console.log(`  Title: ${video.title}`);
      console.log(`  Status: ${video.status || 'UNDEFINED'}`);
      console.log(`  isPublic: ${video.isPublic}`);
      console.log(`  Author ID: ${video.author}`);
      console.log(`  Uploaded: ${video.uploadedAt}`);
    });

    // Check unique status values
    console.log('\n=== UNIQUE STATUS VALUES IN DATABASE ===');
    const uniqueStatuses = await Video.distinct('status');
    console.log('Unique status values:', uniqueStatuses);

    // Check for specific user's videos (you can change this ID)
    if (process.argv[2]) {
      const userId = process.argv[2];
      console.log(`\n=== VIDEOS FOR USER ${userId} ===`);
      const userVideos = await Video.find({ author: userId }).select('title status isPublic');
      console.log(`Found ${userVideos.length} videos for this user`);
      userVideos.forEach(v => {
        console.log(`  - ${v.title} (status: ${v.status}, public: ${v.isPublic})`);
      });
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkVideoStatus();