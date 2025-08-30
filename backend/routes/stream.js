const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Stream video with range support
router.get('/video/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const videoPath = path.join(__dirname, '..', 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      // Create read stream for the requested range
      const file = fs.createReadStream(videoPath, { start, end });
      
      // Set headers for partial content
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
        'Cache-Control': 'no-cache'
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range requested, send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': 'Range',
        'Cache-Control': 'no-cache'
      };
      
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Video streaming error:', error);
    res.status(500).json({ message: 'Error streaming video' });
  }
});

// Stream thumbnail
router.get('/thumbnail/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const thumbnailPath = path.join(__dirname, '..', 'thumbnails', filename);
    
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ message: 'Thumbnail not found' });
    }
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'public, max-age=86400');
    res.sendFile(thumbnailPath);
  } catch (error) {
    console.error('Thumbnail streaming error:', error);
    res.status(500).json({ message: 'Error streaming thumbnail' });
  }
});

module.exports = router;