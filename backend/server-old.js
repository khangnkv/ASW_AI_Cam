const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode'); // Add this import
const { fal } = require("@fal-ai/client");
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

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Example with AWS S3 or similar
const uploadToCloud = async (imageBuffer, filename) => {
  // Upload to AWS S3, Google Cloud Storage, etc.
  // Return public download URL
};

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

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const inputImageDataUrl = `data:image/jpeg;base64,${imageBase64}`; // Renamed to avoid conflict
    
    console.log('Submitting job to FAL.ai...');
    
    // Use FAL client to submit and wait for result
    const result = await fal.subscribe("fal-ai/flux-pro/kontext/max", {
      input: {
        prompt: "Transform this portrait into a beautiful Studio Ghibli anime style artwork. Keep the person's facial features recognizable but apply the distinctive Ghibli animation art style with soft colors, gentle lighting, and magical atmosphere.",
        image_url: inputImageDataUrl // Use the renamed variable
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    });

    console.log('Result received:', result);

    // Get the generated image URL
    console.log('Full result structure:', JSON.stringify(result, null, 2));
    console.log('Images array:', result.data?.images);
    console.log('First image object:', result.data?.images?.[0]);

    // Get the generated image URL with better error checking
    const imageUrl = result.data?.images?.[0]?.url;

    if (!imageUrl) {
      console.error('No image URL found in result');
      return res.status(500).json({ 
        error: 'No image URL returned from FAL AI',
        result: result 
      });
    }

    console.log('Image URL:', imageUrl);
    
    // Download and convert to base64
    console.log('Downloading image from FAL.media...');
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxContentLength: 50 * 1024 * 1024, // 50MB max
    });
    
    console.log('Image downloaded, size:', imageResponse.data.length, 'bytes');
    
    const generatedImageBase64 = Buffer.from(imageResponse.data).toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    console.log('Base64 conversion complete, length:', generatedImageBase64.length);
    
    // Generate unique image ID first
    const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store the image temporarily for download
    if (!global.imageStore) global.imageStore = {};
    global.imageStore[imageId] = generatedImageBase64;
    
    // Solution: Create QR code with direct download link
    console.log('Generating QR code with direct download...');
    
    // QR code points directly to the download endpoint
    const directDownloadUrl = `${req.protocol}://${req.get('host')}/download/${imageId}.jpg`;
    const qrCodeDataUrl = await QRCode.toDataURL(directDownloadUrl);
    
    const response = {
      success: true,
      generatedImage: generatedImageDataUrl,
      qrCode: qrCodeDataUrl,
      downloadUrl: directDownloadUrl,
      imageId: imageId,
      message: 'Image processed successfully'
    };
    
    console.log('Sending response to frontend...');
    res.setHeader('Content-Type', 'application/json');
    res.json(response);

  } catch (error) {
    console.error('Error processing image:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Add a mobile-friendly download page
app.get('/download-page/:imageId', (req, res) => {
  try {
    const imageId = req.params.imageId;
    
    if (!global.imageStore || !global.imageStore[imageId]) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Image Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h1>Image Not Found</h1>
          <p>This image may have expired or the link is invalid.</p>
        </body>
        </html>
      `);
    }
    
    const imageBase64 = global.imageStore[imageId];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Download Your AI Generated Image</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          img { 
            max-width: 100%; 
            height: auto; 
            margin: 20px 0; 
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          }
          .download-btn { 
            background: #28a745; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            display: inline-block; 
            margin: 10px; 
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(40,167,69,0.3);
            transition: all 0.3s ease;
          }
          .download-btn:hover {
            background: #218838;
            transform: translateY(-2px);
          }
          .share-btn {
            background: #007bff;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            display: inline-block;
            margin: 10px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,123,255,0.3);
            transition: all 0.3s ease;
          }
          h1 { margin-bottom: 10px; }
          .subtitle { opacity: 0.8; margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎨 Your AI Generated Image</h1>
          <p class="subtitle">Studio Ghibli Style Portrait</p>
          
          <img src="data:image/jpeg;base64,${imageBase64}" alt="Generated Ghibli Style Image">
          
          <div>
            <a href="data:image/jpeg;base64,${imageBase64}" download="ghibli-portrait-${imageId}.jpg" class="download-btn">
              📱 Download to Device
            </a>
            <br>
            <a href="/download/${imageId}.jpg" class="download-btn">
              💾 Direct Download
            </a>
          </div>
          
          <div style="margin-top: 30px;">
            <button onclick="shareImage()" class="share-btn">📤 Share</button>
          </div>
        </div>
        
        <script>
          function shareImage() {
            if (navigator.share) {
              // Convert base64 to blob for sharing
              const base64Data = "${imageBase64}";
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });
              const file = new File([blob], 'ghibli-portrait.jpg', { type: 'image/jpeg' });
              
              navigator.share({
                title: 'My AI Generated Ghibli Portrait',
                text: 'Check out my Studio Ghibli style AI portrait!',
                files: [file]
              });
            } else {
              // Fallback: copy link to clipboard
              navigator.clipboard.writeText(window.location.href).then(() => {
                alert('Link copied to clipboard!');
              });
            }
          }
          
          // Auto-trigger download on mobile devices
          if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            document.addEventListener('DOMContentLoaded', function() {
              // Show instructions for mobile users
              const instructions = document.createElement('div');
              instructions.innerHTML = '<p style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin: 20px 0;">📱 <strong>Mobile Tip:</strong> Tap "Download to Device" to save the image to your phone!</p>';
              document.querySelector('.container').appendChild(instructions);
            });
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    console.error('Error serving download page:', error);
    res.status(500).send('Error loading download page');
  }
});

// Auto-download page that immediately triggers download
app.get('/auto-download/:imageId', (req, res) => {
  try {
    const imageId = req.params.imageId;
    
    if (!global.imageStore || !global.imageStore[imageId]) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Image Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h1>Image Not Found</h1>
          <p>This image may have expired or the link is invalid.</p>
        </body>
        </html>
      `);
    }
    
    const imageBase64 = global.imageStore[imageId];
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Downloading Your AI Image</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          .spinner {
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top: 3px solid #fff;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .download-btn { 
            background: #28a745; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 25px; 
            display: inline-block; 
            margin: 10px; 
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(40,167,69,0.3);
            transition: all 0.3s ease;
          }
          img { 
            max-width: 100%; 
            height: auto; 
            margin: 20px 0; 
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎨 Downloading Your AI Image</h1>
          <div class="spinner"></div>
          <p id="status">Preparing your download...</p>
          
          <img src="data:image/jpeg;base64,${imageBase64}" alt="Generated Ghibli Style Image" style="display:none;" id="previewImg">
          
          <div id="fallback" style="display:none;">
            <p>If download doesn't start automatically:</p>
            <a href="data:image/jpeg;base64,${imageBase64}" download="ghibli-portrait-${imageId}.jpg" class="download-btn" id="manualDownload">
              📱 Download Manually
            </a>
            <a href="/download/${imageId}.jpg" class="download-btn">
              💾 Alternative Download
            </a>
          </div>
        </div>
        
        <script>
          // Function to trigger download
          function triggerDownload() {
            // Method 1: Create invisible link and click it
            const link = document.createElement('a');
            link.href = 'data:image/jpeg;base64,${imageBase64}';
            link.download = 'ghibli-portrait-${imageId}.jpg';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show success message
            document.getElementById('status').textContent = 'Download started! Check your downloads folder.';
            document.getElementById('previewImg').style.display = 'block';
            
            // Show fallback options after a delay
            setTimeout(() => {
              document.getElementById('fallback').style.display = 'block';
              document.querySelector('.spinner').style.display = 'none';
            }, 2000);
          }
          
          // Auto-trigger download when page loads
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(triggerDownload, 1000); // Small delay for better UX
          });
          
          // Fallback for mobile devices that might not support auto-download
          window.addEventListener('load', function() {
            setTimeout(() => {
              if (!document.hidden) {
                // If page is still visible after 3 seconds, show manual options
                document.getElementById('fallback').style.display = 'block';
                document.getElementById('status').textContent = 'Tap the button below to download:';
                document.querySelector('.spinner').style.display = 'none';
              }
            }, 3000);
          });
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    console.error('Error serving auto-download page:', error);
    res.status(500).send('Error loading download page');
  }
});

// Keep your existing download endpoint
app.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imageId = filename.replace('.jpg', '');
    
    console.log(`Download requested for imageId: ${imageId}`);
    
    if (!global.imageStore || !global.imageStore[imageId]) {
      console.log(`Image not found for ID: ${imageId}`);
      return res.status(404).json({ error: 'Image not found or expired' });
    }
    
    const imageBase64 = global.imageStore[imageId];
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="ghibli-portrait-${filename}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    
    console.log(`Serving download for ${filename}, size: ${imageBuffer.length} bytes`);
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error serving download:', error);
    res.status(500).json({ error: 'Failed to serve image' });
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
app.listen(port, '0.0.0.0', () => {
  console.log(`Ghibli Portrait Backend running on port ${port}`);
  console.log(`Local: http://localhost:${port}/health`);
  console.log(`Network: http://0.0.0.0:${port}/health`);
  console.log(`FAL_KEY configured: ${process.env.FAL_KEY ? 'Yes' : 'No'}`);
  if (process.env.FAL_KEY) {
    console.log(`Using FAL_KEY starting with: ${process.env.FAL_KEY.substring(0, 5)}...`);
  }
});