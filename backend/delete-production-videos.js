const mongoose = require('mongoose');
const Video = require('./models/Video');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deleteAllProductionVideos() {
  try {
    // Connect to production MongoDB Atlas
    const productionUri = process.env.MONGODB_URI || 'mongodb+srv://utkarshgoel54321:c7g5HxMfZ7I1L5A5@cluster0.ymjkg.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Connecting to production MongoDB Atlas...');
    await mongoose.connect(productionUri);
    console.log('Connected to production MongoDB');
    
    // Get all videos to delete their files
    const videos = await Video.find({});
    console.log(`Found ${videos.length} videos to delete from production`);
    
    // Delete all videos from database
    const result = await Video.deleteMany({});
    console.log(`Deleted ${result.deletedCount} videos from production database`);
    
    console.log('All production videos deleted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllProductionVideos();