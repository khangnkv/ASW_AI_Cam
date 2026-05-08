const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { fal } = require("@fal-ai/client");
require('dotenv').config();

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

// Middleware
router.use(express.json());

// Main image generation endpoint
router.post('/generate', upload.single('image'), async (req, res) => {
  try {
    console.log('Received image generation request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log('Submitting job to FAL.ai...');
    
    // Use FAL client to submit and wait for result
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max", {
      input: {
        prompt: "Transform this portrait into a beautiful Studio Ghibli anime style artwork. Keep the person's facial features recognizable but apply the distinctive Ghibli animation art style with soft colors, gentle lighting, and magical atmosphere.",
        image_url: imageDataUrl
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    });

    console.log('Result received:', result);

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

module.exports = router;