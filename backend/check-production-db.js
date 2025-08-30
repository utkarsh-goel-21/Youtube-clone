const mongoose = require('mongoose');
const Video = require('./models/Video');

// Use your production MongoDB URI
const MONGODB_URI = 'mongodb+srv://utkarsh-goel-21:%23LIVElife123@cluster0.wcfyqje.mongodb.net/youtube-clone?retryWrites=true&w=majority&appName=Cluster0';

async function checkProductionDB() {
  try {
    // Connect to production MongoDB
    console.log('Connecting to production MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Count total videos
    const totalVideos = await Video.countDocuments();
    console.log('=== PRODUCTION DATABASE STATUS ===');
    console.log('Total videos in database:', totalVideos);

    // Check the key queries that are failing
    console.log('\n=== CHECKING KEY QUERIES ===');
    
    // 1. Recommended query (WORKING)
    const recommendedQuery = { isPublic: true, status: 'active' };
    const recommendedCount = await Video.countDocuments(recommendedQuery);
    console.log(`\n1. RECOMMENDED (Working) - Query: { isPublic: true, status: 'active' }`);
    console.log(`   Results: ${recommendedCount} videos`);

    // 2. Trending query (NOT WORKING)
    const trendingQuery = { status: 'active', isPublic: true };
    const trendingCount = await Video.countDocuments(trendingQuery);
    console.log(`\n2. TRENDING - Query: { status: 'active', isPublic: true }`);
    console.log(`   Results: ${trendingCount} videos`);

    // 3. My Videos query (NOT WORKING) 
    const myVideosQuery = { status: { $ne: 'deleted' } };
    const myVideosCount = await Video.countDocuments(myVideosQuery);
    console.log(`\n3. MY VIDEOS - Query: { status: { $ne: 'deleted' } }`);
    console.log(`   Results: ${myVideosCount} videos`);

    // Check what status values actually exist
    console.log('\n=== ACTUAL STATUS VALUES IN DB ===');
    const uniqueStatuses = await Video.distinct('status');
    console.log('Unique status values:', uniqueStatuses);

    // Check videos without status field
    const noStatusCount = await Video.countDocuments({ status: { $exists: false } });
    console.log('Videos WITHOUT status field:', noStatusCount);

    // Check videos with null status
    const nullStatusCount = await Video.countDocuments({ status: null });
    console.log('Videos with NULL status:', nullStatusCount);

    // Get sample videos to see their structure
    console.log('\n=== SAMPLE VIDEOS (First 3) ===');
    const samples = await Video.find().limit(3).select('title status isPublic author views uploadedAt');
    samples.forEach((video, i) => {
      console.log(`\nVideo ${i + 1}:`);
      console.log(`  Title: ${video.title}`);
      console.log(`  Status: "${video.status}" (type: ${typeof video.status})`);
      console.log(`  isPublic: ${video.isPublic} (type: ${typeof video.isPublic})`);
      console.log(`  Views: ${video.views}`);
      console.log(`  Uploaded: ${video.uploadedAt}`);
    });

    // Check if there's a mismatch in field types
    console.log('\n=== CHECKING FIELD TYPES ===');
    const publicTrueCount = await Video.countDocuments({ isPublic: true });
    const publicStringTrueCount = await Video.countDocuments({ isPublic: "true" });
    console.log(`Videos with isPublic === true (boolean): ${publicTrueCount}`);
    console.log(`Videos with isPublic === "true" (string): ${publicStringTrueCount}`);

    // THE FIX: Check what happens if we don't filter by status
    console.log('\n=== POTENTIAL FIX ===');
    const noStatusFilterCount = await Video.countDocuments({ isPublic: true });
    console.log(`Videos with ONLY isPublic: true (no status filter): ${noStatusFilterCount}`);
    
    // Check a specific user's videos
    const testUser = await Video.findOne().select('author');
    if (testUser) {
      const userVideos = await Video.countDocuments({ author: testUser.author });
      const userVideosNotDeleted = await Video.countDocuments({ 
        author: testUser.author, 
        status: { $ne: 'deleted' } 
      });
      console.log(`\n=== USER ${testUser.author} VIDEOS ===`);
      console.log(`Total videos: ${userVideos}`);
      console.log(`Videos with status != 'deleted': ${userVideosNotDeleted}`);
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkProductionDB();