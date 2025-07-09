const { fal } = require("@fal-ai/client");

// Configure FAL client
fal.config({
  credentials: process.env.FAL_KEY,
});

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    if (!process.env.FAL_KEY) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'FAL_KEY not configured' })
      };
    }

    // Parse the multipart form data (you'd need to handle this properly)
    // For now, assuming the image is sent as base64 in JSON
    const body = JSON.parse(event.body);
    const imageDataUrl = body.image;

    if (!imageDataUrl) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No image provided' })
      };
    }

    console.log('Processing image with FAL.ai...');
    
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

    // Get the generated image URL and convert to base64
    const generatedImageUrl = result.images[0].url;
    
    // Download and convert to base64
    const fetch = require('node-fetch');
    const imageResponse = await fetch(generatedImageUrl);
    const imageBuffer = await imageResponse.buffer();
    const generatedImageBase64 = imageBuffer.toString('base64');
    const generatedImageDataUrl = `data:image/jpeg;base64,${generatedImageBase64}`;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        ghibliImage: generatedImageDataUrl,
        message: 'Image processed successfully'
      })
    };

  } catch (error) {
    console.error('Error processing image:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to process image',
        details: error.message
      })
    };
  }
};