// backend/server.js - CORRECTED VERSION

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { fal } = require("@fal-ai/client");
const QRCode = require('qrcode');
require('dotenv').config();

// CRITICAL: Ensure Blob is available
const { Blob } = require('node:buffer');

// Verify Blob is working
console.log('Blob support:', typeof Blob !== 'undefined' ? '✅ Available' : '❌ Not available');

const app = express();
const port = process.env.PORT || 3000;

console.log('=== ASSETWISE SERVER STARTUP ===');
console.log('Current working directory:', process.cwd());
console.log('FAL_KEY configured:', process.env.FAL_KEY ? 'Yes' : 'No');
console.log('PORT:', port);
console.log('Server file: backend/server.js (Corrected)');
console.log('=====================================');

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
  console.log('✅ FAL client configured');
} else {
  console.error('❌ FAL_KEY not found in environment variables');
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://*.railway.app', 
        'https://*.up.railway.app',
        'https://*.netlify.app',
        'https://majestic-trifle-1309e2.netlify.app'
      ]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer configuration remains the same
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Health check and other endpoints remain the same
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString(), service: 'assetwise-ai-generator' }));

// Main image generation endpoint remains the same
app.post('/api/generate', upload.any(), async (req, res) => {
    // This endpoint was working correctly with data URLs, so no changes needed
    // For consistency you could also change it to use Blobs, but we will leave it
    // as is to minimize changes.
  try {
    const { feature, prompt } = req.body;
    const mainImageFile = req.files.find(f => f.fieldname === 'image');
    if (!mainImageFile) return res.status(400).json({ error: 'No main image provided' });

    const imageBase64 = mainImageFile.buffer.toString('base64');
    let modelInput;

    if (feature === 'custom') {
      if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'Custom prompt is required' });
      modelInput = { prompt: prompt.trim(), image_url: `data:${mainImageFile.mimetype};base64,${imageBase64}` };
    } else {
      modelInput = {
        prompt: "Transform this portrait into a beautiful stylized artwork with enhanced colors, artistic lighting, and professional quality. Maintain the person's facial features while applying artistic enhancement.",
        image_url: `data:${mainImageFile.mimetype};base64,${imageBase64}`
      };
    }

    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max", {
      input: modelInput,
      logs: true,
    });

    let generatedImageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url || result.data?.image_url;
    if (!generatedImageUrl) throw new Error('No generated image found in response');

    const imageResponse = await axios.get(generatedImageUrl, { responseType: 'arraybuffer' });
    const generatedImageDataUrl = `data:image/jpeg;base64,${Buffer.from(imageResponse.data).toString('base64')}`;
    const qrCode = await QRCode.toDataURL(generatedImageUrl);

    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      publicImageUrl: generatedImageUrl,
      qrCode: qrCode,
      feature: feature,
      promptUsed: modelInput.prompt,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing /api/generate:', error);
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
});


// Advanced Face Swap endpoint - FINAL CORRECTED VERSION
app.post('/api/face-swap', upload.any(), async (req, res) => {
  try {
    console.log('=== AssetWise: Advanced Face Swap Request (FINAL CORRECTED) ===');
    const { gender_0, workflow_type, upscale } = req.body;
    const files = req.files || [];
    
    console.log('=== FACE SWAP REQUEST DETAILS ===');
    console.log('Parameters:', { gender_0, workflow_type, upscale });
    console.log('Uploaded files:', files.map(f => ({ field: f.fieldname, name: f.originalname, size: f.size, type: f.mimetype })));
    
    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured' });
    }

    // Convert files array to object for easier access
    const filesByField = {};
    files.forEach(file => {
      if (!filesByField[file.fieldname]) {
        filesByField[file.fieldname] = [];
      }
      filesByField[file.fieldname].push(file);
    });
    
    console.log('Files by field:', Object.keys(filesByField));

    // Validate required files
    if (!filesByField.face_image?.[0]) {
      return res.status(400).json({ error: 'Face image (camera capture) is required' });
    }
    
    if (!filesByField.target_image?.[0]) {
      return res.status(400).json({ error: 'Target image is required' });
    }

    // Get the actual file objects
    const faceImageFile = filesByField.face_image[0];
    const targetImageFile = filesByField.target_image[0];

    console.log('=== PREPARING BLOBS FOR FAL.AI ===');
    console.log('Face image file:', { name: faceImageFile.originalname, size: faceImageFile.size, type: faceImageFile.mimetype });
    console.log('Target image file:', { name: targetImageFile.originalname, size: targetImageFile.size, type: targetImageFile.mimetype });

    // *** CRITICAL FIX: Convert buffers to proper Blobs ***
    const faceImageBlob = new Blob([faceImageFile.buffer], { type: faceImageFile.mimetype });
    const targetImageBlob = new Blob([targetImageFile.buffer], { type: targetImageFile.mimetype });

    console.log('✅ Blobs created:', {
      faceImageBlob: { size: faceImageBlob.size, type: faceImageBlob.type },
      targetImageBlob: { size: targetImageBlob.size, type: targetImageBlob.type }
    });

    // Prepare FAL.ai input with proper parameter types
    const falInput = {
      face_image_0: faceImageBlob,           // Blob object, NOT base64 string
      target_image: targetImageBlob,         // Blob object, NOT base64 string
      gender_0: gender_0 || "male",
      workflow_type: workflow_type || "user_hair",
      upscale: upscale === 'true' || upscale === true  // Proper boolean conversion
    };

    console.log('=== FAL.AI FACE SWAP SUBMISSION (BLOB VERSION) ===');
    console.log('Input parameters:', {
      gender_0: falInput.gender_0,
      workflow_type: falInput.workflow_type,
      upscale: falInput.upscale,
      face_image_0: `Blob(size: ${falInput.face_image_0.size}, type: ${falInput.face_image_0.type})`,
      target_image: `Blob(size: ${falInput.target_image.size}, type: ${falInput.target_image.type})`
    });

    // Submit to FAL.ai advanced face-swap with Blob inputs
    let result;
    try {
      result = await fal.subscribe("easel-ai/advanced-face-swap", {
        input: falInput,
        logs: true,
        onQueueUpdate: (update) => {
          console.log('Face-swap queue update:', update.status);
          if (update.status === "IN_PROGRESS" && update.logs) {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });
    } catch (falError) {
      console.error('FAL.ai API Error Details:', {
        status: falError.status,
        message: falError.message,
        body: falError.body,
        stack: falError.stack
      });
      
      // Enhanced error diagnosis
      let errorMessage = 'FAL.ai face-swap failed';
      let errorDetails = falError.message;
      
      if (falError.status === 500) {
        errorDetails = 'FAL.ai internal server error. This could be due to:\n' +
          '• Invalid image format or corruption\n' +
          '• Images too large or too small\n' +
          '• Face detection failed\n' +
          '• Temporary FAL.ai service issues';
      } else if (falError.status === 400) {
        errorDetails = 'Invalid input parameters. Check image formats and parameters.';
      } else if (falError.body?.detail) {
        errorDetails = falError.body.detail;
      }
      
      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        falStatus: falError.status,
        troubleshooting: {
          faceImageSize: faceImageFile.size,
          targetImageSize: targetImageFile.size,
          faceImageType: faceImageFile.mimetype,
          targetImageType: targetImageFile.mimetype
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('Face-swap result received:', {
      requestId: result.requestId,
      status: result.status,
      hasData: !!result.data,
      dataKeys: result.data ? Object.keys(result.data) : []
    });

    // Enhanced result debugging
    console.log('=== FAL.AI RESULT STRUCTURE DEBUG ===');
    console.log('Full result keys:', Object.keys(result));
    if (result.data) {
      console.log('Result.data keys:', Object.keys(result.data));
      console.log('Result.data content:', JSON.stringify(result.data, null, 2));
    }

    // Extract the generated image URL with comprehensive checking
    let generatedImageUrl;
    const possiblePaths = [
      result.data?.image?.url,
      result.data?.images?.[0]?.url,
      result.image?.url,
      result.images?.[0]?.url,
      result.data?.output?.url,
      result.data?.result?.url,
      result.data?.generated_image?.url,
      result.data?.swap_image?.url
    ];

    generatedImageUrl = possiblePaths.find(url => url && typeof url === 'string');

    if (!generatedImageUrl) {
      console.error('❌ No image URL found in result. Full result structure:');
      console.error(JSON.stringify(result, null, 2));
      
      return res.status(500).json({
        error: 'No generated image found in face-swap response',
        details: 'FAL.ai completed the request but returned no image URL',
        resultStructure: {
          hasData: !!result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          resultKeys: Object.keys(result)
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Generated face-swap image URL found:', generatedImageUrl);
    
    // Download and convert to base64 for consistent response format
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'AssetWise-AI-Generator/1.0'
      }
    });
    
    const generatedImageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    // Generate QR code for the original URL
    console.log('Generating QR code...');
    const qrCode = await QRCode.toDataURL(generatedImageUrl);
    
    console.log('✅ AssetWise: Advanced face-swap completed successfully');
    
    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      publicImageUrl: generatedImageUrl,
      qrCode: qrCode,
      feature: 'face-swap',
      parameters: {
        workflow_type: falInput.workflow_type,
        gender_0: falInput.gender_0,
        upscale: falInput.upscale
      },
      processedImages: {
        faceImageSize: faceImageFile.size,
        targetImageSize: targetImageFile.size
      },
      timestamp: new Date().toISOString(),
      message: 'Advanced face-swap processing completed successfully'
    });

  } catch (error) {
    console.error('Error in advanced face-swap:', error);
    
    // Enhanced error handling with specific error types
    let errorMessage = 'Failed to process advanced face-swap';
    let errorDetails = error.message;
    
    if (error.message?.includes('No generated image found')) {
      errorMessage = 'FAL.ai returned no image';
      errorDetails = 'The face-swap completed but no image was returned. This might be due to face detection issues.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network error';
      errorDetails = 'Unable to connect to FAL.ai services';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout';
      errorDetails = 'FAL.ai request took too long to complete';
    } else if (error.response?.status === 404) {
      errorMessage = 'Generated image not found';
      errorDetails = 'The generated image URL is no longer accessible';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});


// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Final error handler
app.use((error, req, res, next) => {
  console.error('AssetWise: Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error', details: error.message });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AssetWise AI Generator running on port ${port}`);
  console.log(`🔑 FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
});