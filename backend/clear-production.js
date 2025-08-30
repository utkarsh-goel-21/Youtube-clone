const mongoose = require('mongoose');
require('dotenv').config();

async function clearProduction() {
  try {
    // Use the production MongoDB URI
    const uri = 'mongodb+srv://utkarshgoel54321:c7g5HxMfZ7I1L5A5@cluster0.ymjkg.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Connecting to production MongoDB...');
    await mongoose.connect(uri);
    
    // Delete all videos
    const Video = require('./models/Video');
    const videoResult = await Video.deleteMany({});
    console.log(`Deleted ${videoResult.deletedCount} videos`);
    
    // Delete all comments
    const Comment = require('./models/Comment');
    const commentResult = await Comment.deleteMany({});
    console.log(`Deleted ${commentResult.deletedCount} comments`);
    
    // Delete all playlists
    const Playlist = require('./models/Playlist');
    const playlistResult = await Playlist.deleteMany({});
    console.log(`Deleted ${playlistResult.deletedCount} playlists`);
    
    // Delete all notifications
    const Notification = require('./models/Notification');
    const notifResult = await Notification.deleteMany({});
    console.log(`Deleted ${notifResult.deletedCount} notifications`);
    
    console.log('Production database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearProduction();