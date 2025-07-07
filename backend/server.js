const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('=== DEBUG ENV LOADING ===');
console.log('Current working directory:', process.cwd());
console.log('FAL_KEY from env:', process.env.FAL_KEY);
console.log('FAL_KEY length:', process.env.FAL_KEY?.length);
console.log('=========================');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Main image generation endpoint
app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    console.log('Received image generation request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    // First, upload the image to get a URL
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    // Submit job to queue
    const queueResponse = await axios.post(
      'https://queue.fal.run/fal-ai/flux-pro/kontext/max',
      {
        prompt: "Transform this portrait into a beautiful Studio Ghibli anime style artwork. Keep the person's facial features recognizable but apply the distinctive Ghibli animation art style with soft colors, gentle lighting, and magical atmosphere.",
        image_url: imageDataUrl
      },
      {
        headers: {
          'Authorization': `Key ${process.env.FAL_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const requestId = queueResponse.data.request_id;
    console.log('Job submitted, request ID:', requestId);

    // Poll for result
    let result = null;
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await axios.get(
        `https://queue.fal.run/fal-ai/flux-pro/kontext/max/requests/${requestId}/status`,
        {
          headers: {
            'Authorization': `Key ${process.env.FAL_KEY}`
          }
        }
      );

      if (statusResponse.data.status === 'completed') {
        result = statusResponse.data.result;
        break;
      } else if (statusResponse.data.status === 'failed') {
        throw new Error('AI processing failed');
      }
    }

    if (!result) {
      throw new Error('Processing timeout');
    }

    // Get the generated image URL
    const generatedImageUrl = result.images[0].url;
    
    // Download and convert to base64
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer'
    });
    
    const generatedImageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    res.json({
      success: true,
      ghibliImage: generatedImageDataUrl,
      message: 'Image processed successfully'
    });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Ghibli Portrait Backend running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
  if (process.env.FAL_KEY) {
    console.log(`Using FAL_KEY starting with: ${process.env.FAL_KEY.substring(0, 5)}...`);
  }
});