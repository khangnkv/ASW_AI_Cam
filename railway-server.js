const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { fal } = require("@fal-ai/client");
const sharp = require('sharp');
const fs = require('fs');
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

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images publicly
app.use('/uploads', express.static(uploadsDir));
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'assetwise-ai-generator',
    fal_configured: !!process.env.FAL_KEY
  });
});

// Helper function to save image and return public URL
async function saveImageAndGetUrl(imageBuffer, filename) {
  try {
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, imageBuffer);
    
    // Return public URL
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3000'}`
      : `http://localhost:${port}`;
    
    return `${baseUrl}/uploads/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

// Main image generation endpoint
app.post('/api/generate', upload.fields([
  { name: 'image', maxCount: 1 },          // Main/target image
  { name: 'sourceFaces', maxCount: 5 },    // Multiple source faces
  { name: 'background', maxCount: 1 },     // New background image
  { name: 'template', maxCount: 1 }        // Template/pose reference
]), async (req, res) => {
  try {
    console.log('AssetWise: Received image generation request');
    const { feature, prompt, options, faceSwapMode } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    console.log('Feature:', feature);
    console.log('Custom prompt:', prompt);
    console.log('Face swap mode:', faceSwapMode);
    console.log('Uploaded files:', Object.keys(files || {}));
    
    if (!files?.image?.[0]) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    // Helper function to upload files to FAL CDN
    const uploadToFal = async (file) => {
      const uploadResult = await fal.upload({
        data: file.buffer,
        contentType: file.mimetype
      });
      return uploadResult.url;
    };

    // Convert main image to base64
    const mainImage = files.image[0];
    const imageBase64 = mainImage.buffer.toString('base64');
    
    let result;
    let modelEndpoint;
    let modelInput;
    
    // Route to different models based on feature
    switch (feature) {
      case 'ai-style':
        modelEndpoint = "fal-ai/flux-pro/kontext/max";
        modelInput = {
          prompt: prompt || "Transform this portrait into a beautiful stylized artwork with enhanced colors, artistic lighting, and professional quality. Maintain the person's facial features while applying artistic enhancement.",
          image_url: `data:${mainImage.mimetype};base64,${imageBase64}`
        };
        break;
        
      case 'face-swap':
        modelEndpoint = "easel-ai/advanced-face-swap";
        
        // Prepare face swap input
        modelInput = {
          image_bytes: imageBase64, // Main image in base64
          workflow_type: faceSwapMode === 'preset' ? 'auto_swap' : 'user_hair'
        };

        // Handle preset faces
        if (faceSwapMode === 'preset' && req.body.presetFaces) {
          const presetFaces = JSON.parse(req.body.presetFaces);
          // For now, use auto_swap mode with preset selection
          modelInput.workflow_type = 'auto_swap';
          modelInput.preset_faces = presetFaces;
        }
        // Handle uploaded external faces
        else if (faceSwapMode === 'upload-faces' && files?.sourceFaces) {
          for (let i = 0; i < Math.min(files.sourceFaces.length, 5); i++) {
            const faceUrl = await uploadToFal(files.sourceFaces[i]);
            modelInput[`face_image_${i}`] = faceUrl;
            modelInput[`gender_${i}`] = 'auto';
          }
          modelInput.workflow_type = 'user_faces';
        }
        // Handle full-body background upload
        else if (faceSwapMode === 'upload-background' && files?.background?.[0]) {
          modelInput.background_image = await uploadToFal(files.background[0]);
          modelInput.workflow_type = 'new_background';
        }

        // Add custom prompt if provided for face swap
        if (prompt && prompt.trim()) {
          modelInput.additional_prompt = prompt.trim();
        }

        if (files?.template?.[0]) {
          modelInput.template_image = await uploadToFal(files.template[0]);
        }
        break;
        
      case 'custom':
        modelEndpoint = "fal-ai/flux-pro/kontext/max";
        modelInput = {
          prompt: prompt || "Transform this image with artistic style",
          image_url: `data:${mainImage.mimetype};base64,${imageBase64}`,
          num_inference_steps: options?.steps || 28,
          guidance_scale: options?.guidance || 7.5,
          strength: options?.strength || 0.8
        };
        break;
        
      default:
        throw new Error('Invalid feature selected');
    }
    
    console.log('Submitting to FAL.ai with:', {
      endpoint: modelEndpoint,
      input: { ...modelInput, image_bytes: '...' } // Hide large base64 in logs
    });
    
    // Submit to FAL.ai with enhanced error handling
    result = await fal.subscribe(modelEndpoint, {
      input: modelInput,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update.status);
        // Could send SSE updates here
      },
    }).catch(error => {
      console.error('FAL API error:', error.response?.data || error.message);
      throw new Error(`FAL processing failed: ${error.response?.data?.detail || error.message}`);
    });

    console.log('Result received:', {
      requestId: result.requestId,
      status: result.status
    });

    // Handle different response formats
    let generatedImageUrl;
    if (result.images?.[0]?.url) {
      generatedImageUrl = result.images[0].url;
    } else if (result.data?.images?.[0]?.url) {
      generatedImageUrl = result.data.images[0].url;
    } else if (result.image?.url) {
      generatedImageUrl = result.image.url;
    } else {
      throw new Error('No valid image URL in response');
    }

    // Download and process image
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const imageBuffer = Buffer.from(imageResponse.data);
    const generatedImageBase64 = imageBuffer.toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    // Save image to public directory and get URL
    const filename = `assetwise-${feature}-${Date.now()}.jpg`;
    const publicImageUrl = await saveImageAndGetUrl(imageBuffer, filename);
    
    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      publicImageUrl: publicImageUrl,
      feature: feature,
      requestId: result.requestId,
      message: 'AssetWise AI processing completed successfully'
    });

  } catch (error) {
    console.error('AssetWise: Error processing image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message,
      feature: req.body.feature,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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