const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { fal } = require("@fal-ai/client");
const QRCode = require('qrcode');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

console.log('=== RAILWAY SERVER STARTUP ===');
console.log('Current working directory:', process.cwd());
console.log('FAL_KEY configured:', process.env.FAL_KEY ? 'Yes' : 'No');
console.log('PORT:', port);
console.log('===============================');

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.railway.app', 'https://*.up.railway.app'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'assetwise-ai-generator',
    fal_configured: !!process.env.FAL_KEY
  });
});

// Helper function to add AssetWise logo and timestamp overlay
async function addOverlayToImage(imageBuffer) {
  try {
    // Create timestamp text
    const now = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const timestamp = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    // For now, return the original image
    // TODO: Add Sharp-based overlay with AssetWise logo and timestamp
    // This would require the logo file and Sharp configuration
    return imageBuffer;
  } catch (error) {
    console.error('Error adding overlay:', error);
    return imageBuffer;
  }
}

// Helper function to generate QR code
async function generateQRCode(imageUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(imageUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}
// Main image generation endpoint
app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    console.log('AssetWise: Received image generation request');
    const { feature, prompt } = req.body;
    
    console.log('Feature:', feature);
    console.log('Custom prompt:', prompt);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
    
    console.log('Submitting job to FAL.ai with feature:', feature);
    
    let result;
    let modelEndpoint;
    let modelInput;
    
    // Route to different models based on feature
    switch (feature) {
      case 'ai-style':
        modelEndpoint = "fal-ai/flux-pro/kontext/max";
        modelInput = {
          prompt: "Transform this portrait into a beautiful stylized artwork with enhanced colors, artistic lighting, and professional quality. Maintain the person's facial features while applying artistic enhancement.",
          image_url: imageDataUrl
        };
        break;
        
      case 'face-swap':
        // Use advanced face swap model
        modelEndpoint = "fal-ai/flux-pro";
        modelInput = {
          prompt: "Professional portrait with face swap technology, high quality, detailed facial features, realistic lighting and skin texture",
          image_url: imageDataUrl
        };
        break;
        
      case 'custom':
        modelEndpoint = "fal-ai/flux-pro";
        modelInput = {
          prompt: prompt || "Transform this image with artistic style",
          image_url: imageDataUrl
        };
        break;
        
      default:
        throw new Error('Invalid feature selected');
    }
    
    // Submit to FAL.ai
    result = await fal.subscribe(modelEndpoint, {
      input: modelInput,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    });

    console.log('Result received:', result);

    // Check response structure (handle both old and new API responses)
    let generatedImageUrl;
    if (result.images && result.images.length > 0) {
      generatedImageUrl = result.images[0].url;
    } else if (result.data && result.data.images && result.data.images.length > 0) {
      generatedImageUrl = result.data.images[0].url;
    } else {
      throw new Error('No images generated by FAL.ai');
    }

    // Download and convert to base64
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });
    
    // Add AssetWise overlay (logo + timestamp)
    const processedImageBuffer = await addOverlayToImage(imageResponse.data);
    
    const generatedImageBase64 = Buffer.from(processedImageBuffer).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    // Generate QR code for download
    const qrCode = await generateQRCode(generatedImageDataUrl);
    
    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      qrCode: qrCode,
      feature: feature,
      message: 'AssetWise AI processing completed successfully'
    });

  } catch (error) {
    console.error('AssetWise: Error processing image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Serve the React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('AssetWise: Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AssetWise AI Generator running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
  console.log(`❤️ Health: http://localhost:${port}/health`);
  console.log(`🔑 FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
  if (process.env.FAL_KEY) {
    console.log(`Using FAL_KEY starting with: ${process.env.FAL_KEY.substring(0, 5)}...`);
  }
});