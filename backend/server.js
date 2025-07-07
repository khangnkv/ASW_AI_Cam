const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
    
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Check if FAL_KEY is configured
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    console.log('Processing image with Fal AI...');
    
    // Convert buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    
    // Prepare the request to Fal AI
    const falRequest = {
      prompt: "Transform this portrait into a beautiful Studio Ghibli anime style artwork. Keep the person's facial features recognizable but apply the distinctive Ghibli animation art style with soft colors, gentle lighting, and magical atmosphere. Make it look like a character from a Studio Ghibli movie.",
      image_url: imageDataUrl,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      strength: 0.85,
      safety_tolerance: 2,
      format: "jpeg"
    };

    // Make request to Fal AI
    const falResponse = await axios.post(
      'https://fal.run/fal-ai/flux-pro',
      falRequest,
      {
        headers: {
          'Authorization': `Key ${process.env.FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000 // 2 minutes timeout
      }
    );

    console.log('Fal AI response received');

    // Extract the generated image URL
    const generatedImageUrl = falResponse.data.images[0].url;
    
    // Download the generated image
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer'
    });
    
    // Convert to base64
    const generatedImageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    console.log('Image processing completed successfully');
    
    // Return the generated image
    res.json({
      success: true,
      ghibliImage: generatedImageDataUrl,
      message: 'Image processed successfully'
    });

  } catch (error) {
    console.error('Error processing image:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Fal AI API error
      console.error('Fal AI API error:', error.response.data);
      res.status(500).json({
        error: 'Failed to process image with AI service',
        details: error.response.data.detail || 'Unknown AI service error'
      });
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
      res.status(500).json({
        error: 'Network error while processing image',
        details: 'Unable to connect to AI service'
      });
    } else {
      // Other errors
      console.error('Processing error:', error.message);
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
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
});