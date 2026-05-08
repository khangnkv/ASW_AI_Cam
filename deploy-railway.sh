#!/bin/bash

# Railway Deployment Script
# This script helps deploy the Ghibli Portrait Generator to Railway

echo "🚂 Railway Deployment Helper"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "railway-server.js" ]; then
    echo "❌ Error: railway-server.js not found. Please run this from the project root."
    exit 1
fi

echo "✅ Project structure looks good"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

echo "✅ Railway CLI ready"

# Build the project locally to test
echo "🔨 Building project locally..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful"

# Check if Docker is available for local testing
if command -v docker &> /dev/null; then
    echo "🐳 Testing Docker build..."
    docker build -f Dockerfile.railway -t ghibli-railway-test .
    
    if [ $? -ne 0 ]; then
        echo "❌ Docker build failed. Please fix Dockerfile issues."
        exit 1
    fi
    
    echo "✅ Docker build successful"
else
    echo "⚠️  Docker not found. Skipping local Docker test."
fi

# Railway deployment
echo "🚀 Ready to deploy to Railway!"
echo ""
echo "Next steps:"
echo "1. Make sure you have set your FAL_KEY in Railway environment variables"
echo "2. Run: railway login"
echo "3. Run: railway link (to link to existing project or create new)"
echo "4. Run: railway up"
echo ""
echo "Or deploy via GitHub:"
echo "1. Push this code to GitHub"
echo "2. Connect your GitHub repo to Railway"
echo "3. Set FAL_KEY environment variable in Railway dashboard"
echo ""
echo "Happy deploying! 🎉"
