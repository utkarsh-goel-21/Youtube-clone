const mongoose = require('mongoose');
const Video = require('./models/Video');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deleteAllVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-clone');
    console.log('Connected to MongoDB');
    
    // Get all videos to delete their files
    const videos = await Video.find({});
    console.log(`Found ${videos.length} videos to delete`);
    
    // Delete video and thumbnail files
    for (const video of videos) {
      // Delete video file
      if (video.videoUrl) {
        const videoFilename = video.videoUrl.split('/').pop();
        const videoPath = path.join(__dirname, 'uploads', videoFilename);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          console.log(`Deleted video file: ${videoFilename}`);
        }
      }
      
      // Delete thumbnail file
      if (video.thumbnailUrl) {
        const thumbnailFilename = video.thumbnailUrl.split('/').pop();
        const thumbnailPath = path.join(__dirname, 'thumbnails', thumbnailFilename);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
          console.log(`Deleted thumbnail: ${thumbnailFilename}`);
        }
      }
    }
    
    // Delete all videos from database
    const result = await Video.deleteMany({});
    console.log(`Deleted ${result.deletedCount} videos from database`);
    
    console.log('All videos deleted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllVideos();