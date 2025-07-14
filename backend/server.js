// backend/server.js - CONSOLIDATED VERSION

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const { fal } = require("@fal-ai/client");
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

console.log('=== ASSETWISE SERVER STARTUP ===');
console.log('Current working directory:', process.cwd());
console.log('FAL_KEY configured:', process.env.FAL_KEY ? 'Yes' : 'No');
console.log('PORT:', port);
console.log('Server file: backend/server.js');
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
    ? ['https://*.railway.app', 'https://*.up.railway.app'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads with flexible field names
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Allow multiple files
  },
  fileFilter: (req, file, cb) => {
    console.log('=== MULTER FILE FILTER ===');
    console.log('Field name:', file.fieldname);
    console.log('Original name:', file.originalname);
    console.log('Mime type:', file.mimetype);
    
    // Accept all image files regardless of field name
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Debug endpoint to confirm which server is running
app.get('/debug/server-info', (req, res) => {
  res.json({
    serverFile: 'backend/server.js',
    timestamp: new Date().toISOString(),
    hasCustomPromptLogic: true,
    fal_configured: !!process.env.FAL_KEY,
    port: port,
    nodeEnv: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'assetwise-ai-generator',
    serverFile: 'backend/server.js',
    fal_configured: !!process.env.FAL_KEY,
    version: '2.0.0'
  });
});

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

// Main image generation endpoint - UPDATED FOR CUSTOM PROMPTS
app.post('/api/generate', upload.any(), async (req, res) => {
  try {
    console.log('=== AssetWise: Received image generation request ===');
    const { feature, prompt } = req.body;
    const files = req.files || [];
    
    console.log('=== REQUEST DETAILS ===');
    console.log('Feature:', feature);
    console.log('Prompt received:', JSON.stringify(prompt));
    console.log('Prompt type:', typeof prompt);
    console.log('Prompt length:', prompt?.length || 0);
    console.log('Uploaded files:', files.map(f => ({ field: f.fieldname, name: f.originalname, size: f.size })));
    
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
    
    if (!filesByField.image?.[0]) {
      return res.status(400).json({ error: 'No main image provided' });
    }

    // Get the main image
    const mainImage = filesByField.image[0];
    const imageBase64 = mainImage.buffer.toString('base64');
    
    let result;
    let modelEndpoint;
    let modelInput;
    
    console.log('=== FEATURE PROCESSING ===');
    console.log('Processing feature:', feature);
    
    // Route to different processing based on feature
    switch (feature) {
      case 'ai-style':
        console.log('✅ AI-style: Using default enhancement prompt');
        modelEndpoint = "fal-ai/flux-pro/kontext/max";
        modelInput = {
          prompt: "Transform this portrait into a beautiful stylized artwork with enhanced colors, artistic lighting, and professional quality. Maintain the person's facial features while applying artistic enhancement.",
          image_url: `data:${mainImage.mimetype};base64,${imageBase64}`
        };
        console.log('AI-style prompt:', modelInput.prompt.substring(0, 100) + '...');
        break;
        
      case 'custom':
        console.log('🎯 Custom: Processing user prompt');
        
        // STRICT VALIDATION for custom prompts
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          console.error('❌ Custom prompt validation failed:', {
            hasPrompt: !!prompt,
            promptType: typeof prompt,
            promptLength: prompt?.length || 0,
            promptTrimmed: prompt?.trim()?.length || 0
          });
          return res.status(400).json({ 
            error: 'Custom prompt is required for custom generation',
            details: 'Please provide a prompt describing how you want your image transformed',
            received: { prompt, type: typeof prompt, length: prompt?.length || 0 }
          });
        }
        
        const finalPrompt = prompt.trim();
        console.log('✅ Custom prompt validated');
        console.log('Final custom prompt:', JSON.stringify(finalPrompt));
        console.log('Custom prompt length:', finalPrompt.length);
        
        modelEndpoint = "fal-ai/flux-pro/kontext/max";
        modelInput = {
          prompt: finalPrompt, // Use the user's exact prompt
          image_url: `data:${mainImage.mimetype};base64,${imageBase64}`
        };
        
        console.log('🎯 USING CUSTOM PROMPT:', finalPrompt);
        break;
        
      default:
        throw new Error(`Unknown feature: ${feature}`);
    }
    
    console.log('=== FAL.AI SUBMISSION ===');
    console.log('Endpoint:', modelEndpoint);
    console.log('Prompt being sent to FAL:', modelInput.prompt);
    
    // Submit to FAL.ai
    result = await fal.subscribe(modelEndpoint, {
      input: modelInput,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update.status);
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('Result received:', {
      requestId: result.requestId,
      status: result.status,
      hasData: !!result.data,
      hasImages: !!(result.data?.images || result.images)
    });

    // Handle different response formats from FAL.ai
    let generatedImageUrl;
    if (result.data?.images?.[0]?.url) {
      generatedImageUrl = result.data.images[0].url;
    } else if (result.images?.[0]?.url) {
      generatedImageUrl = result.images[0].url;
    } else if (result.data?.image_url) {
      generatedImageUrl = result.data.image_url;
    } else {
      throw new Error('No generated image found in response');
    }

    console.log('Generated image URL found');
    
    // Download and convert to base64
    const imageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const generatedImageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    // Generate QR code
    console.log('Generating QR code...');
    const qrCode = await generateQRCode(generatedImageUrl);
    
    console.log('✅ AssetWise: Image processing completed successfully');
    console.log('Used prompt:', modelInput.prompt.substring(0, 100) + '...');
    
    res.json({
      success: true,
      generatedImage: generatedImageDataUrl,
      publicImageUrl: generatedImageUrl,
      qrCode: qrCode,
      feature: feature,
      promptUsed: modelInput.prompt, // Add this for debugging
      timestamp: new Date().toISOString(),
      message: 'AssetWise AI processing completed successfully'
    });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Serve the React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
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
  console.log(`🔍 Debug: http://localhost:${port}/debug/server-info`);
  console.log(`🔑 FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
  console.log(`📁 Server file: backend/server.js`);
  if (process.env.FAL_KEY) {
    console.log(`Using FAL_KEY starting with: ${process.env.FAL_KEY.substring(0, 5)}...`);
  }
});