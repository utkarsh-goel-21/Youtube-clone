const mongoose = require('mongoose');
const Video = require('./models/Video');
require('dotenv').config();

async function deleteBrokenVideos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youtube-clone');
    console.log('Connected to MongoDB');
    
    // Find videos with old format URLs or specific broken videos
    const brokenVideos = await Video.find({
      $or: [
        { videoUrl: { $regex: /^uploads\// } },  // Old format
        { videoUrl: { $regex: /^\/uploads\// } }, // Old format with leading slash
        { duration: { $lte: 0 } },  // No duration
        { status: { $ne: 'active' } }  // Not active
      ]
    });
    
    console.log(`Found ${brokenVideos.length} potentially broken videos`);
    
    // Delete specific test videos that are known to be broken
    const testVideoIds = [
      '68ad3750768a02a636ae83d5', // Old cat video
      '68ad2b4be20150aaf12b7242'  // Another old cat video
    ];
    
    for (const id of testVideoIds) {
      try {
        const result = await Video.findByIdAndDelete(id);
        if (result) {
          console.log(`Deleted video: ${id}`);
        }
      } catch (err) {
        console.log(`Video ${id} not found or already deleted`);
      }
    }
    
    console.log('Cleanup complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteBrokenVideos();