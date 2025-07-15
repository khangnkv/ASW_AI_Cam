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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // In production, check Railway domains
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        /https:\/\/.*\.railway\.app$/,
        /https:\/\/.*\.up\.railway\.app$/
      ];
      
      const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
      if (isAllowed) {
        return callback(null, true);
      }
      
      // Log the rejected origin for debugging
      console.log('CORS rejected origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In development, allow common development origins
    const devOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    if (devOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(null, true); // Allow all in development
  },
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
app.get('/health', (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'assetwise-ai-generator',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
      fal_configured: !!process.env.FAL_KEY,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    console.log('Health check requested:', {
      status: healthData.status,
      timestamp: healthData.timestamp,
      fal_configured: healthData.fal_configured
    });
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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

    // *** NEW: Store image for download endpoint ***
    const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (!global.imageStore) global.imageStore = {};
    global.imageStore[imageId] = generatedImageBase64;

    console.log('💾 Stored image for download with ID:', imageId);

    // Create download URL for QR code
    const downloadUrl = `${req.protocol}://${req.get('host')}/download/${imageId}`;
    console.log('📱 Download URL created:', downloadUrl);

    // Instead of creating download URL for QR code, use direct FAL.ai URL
    console.log('Generating QR code for direct image URL...');
    const qrCode = await QRCode.toDataURL(generatedImageUrl, {  // Use generatedImageUrl directly
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('✅ QR code generated for direct image URL:', generatedImageUrl);

    console.log('✅ AssetWise: Advanced face-swap completed successfully');
    
    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      publicImageUrl: generatedImageUrl,      // Original FAL.ai URL for display
      downloadUrl: downloadUrl,               // Keep download URL for web interface
      qrCode: qrCode,                        // QR code points to direct FAL.ai URL
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
      imageId: imageId,                      // Include image ID for reference
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

// Image download endpoint - forces download instead of display
app.get('/download/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    console.log('=== Download request for image:', imageId);
    
    // Check if we have the image stored temporarily
    if (global.imageStore && global.imageStore[imageId]) {
      console.log('✅ Found image in temporary storage');
      
      const imageBase64 = global.imageStore[imageId];
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Set headers to force download
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="assetwise-generated-${imageId}.jpg"`);
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      console.log('📥 Sending image for download, size:', imageBuffer.length, 'bytes');
      return res.send(imageBuffer);
    }
    
    // If not in temporary storage, return 404
    console.log('❌ Image not found in storage');
    res.status(404).json({ 
      error: 'Image not found', 
      details: 'The requested image is no longer available for download' 
    });
    
  } catch (error) {
    console.error('Error in download endpoint:', error);
    res.status(500).json({ 
      error: 'Download failed', 
      details: error.message 
    });
  }
});

// Cleanup old images periodically (run every hour)
setInterval(() => {
  if (global.imageStore) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    Object.keys(global.imageStore).forEach(imageId => {
      // Extract timestamp from imageId (assumes format: timestamp-randomstring)
      const timestamp = parseInt(imageId.split('-')[0]);
      if (now - timestamp > oneHour) {
        delete global.imageStore[imageId];
        console.log('🗑️ Cleaned up old image:', imageId);
      }
    });
  }
}, 60 * 60 * 1000); // Run every hour

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
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🔑 FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
  
  // Railway specific logging
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    console.log(`🔗 Railway URL: ${process.env.RAILWAY_STATIC_URL || 'Not set'}`);
  }
  
  // Test health endpoint immediately
  console.log('🔍 Testing health endpoint...');
  require('http').get(`http://localhost:${port}/health`, (res) => {
    console.log(`✅ Health check response: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('❌ Health check failed:', err.message);
  });
});

console.log('=== RAILWAY STARTUP DIAGNOSTICS ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('FAL_KEY present:', !!process.env.FAL_KEY);

// Test Blob availability
try {
  const { Blob } = require('node:buffer');
  console.log('✅ Blob support: Available');
  
  // Test Blob creation
  const testBlob = new Blob(['test'], { type: 'text/plain' });
  console.log('✅ Blob test: Working (size:', testBlob.size, ')');
} catch (error) {
  console.error('❌ Blob support error:', error.message);
  
  // Fallback for older Node versions
  try {
    global.Blob = require('buffer').Blob;
    console.log('✅ Blob fallback: Working');
  } catch (fallbackError) {
    console.error('❌ Blob fallback failed:', fallbackError.message);
  }
}

console.log('===================================');