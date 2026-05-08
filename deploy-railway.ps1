# Railway Deployment Script for Windows
# This script helps deploy the Ghibli Portrait Generator to Railway

Write-Host "🚂 Railway Deployment Helper" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "railway-server.js")) {
    Write-Host "❌ Error: railway-server.js not found. Please run this from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project structure looks good" -ForegroundColor Green

# Check if railway CLI is installed
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI ready" -ForegroundColor Green
} catch {
    Write-Host "📦 Railway CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Build the project locally to test
Write-Host "🔨 Building project locally..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please fix build errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green

# Check if Docker is available for local testing
try {
    docker --version | Out-Null
    Write-Host "🐳 Testing Docker build..." -ForegroundColor Yellow
    docker build -f Dockerfile.railway -t ghibli-railway-test .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker build failed. Please fix Dockerfile issues." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Docker build successful" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker not found. Skipping local Docker test." -ForegroundColor Yellow
}

# Railway deployment instructions
Write-Host ""
Write-Host "🚀 Ready to deploy to Railway!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Make sure you have set your FAL_KEY in Railway environment variables" -ForegroundColor White
Write-Host "2. Run: railway login" -ForegroundColor White
Write-Host "3. Run: railway link (to link to existing project or create new)" -ForegroundColor White
Write-Host "4. Run: railway up" -ForegroundColor White
Write-Host ""
Write-Host "Or deploy via GitHub:" -ForegroundColor White
Write-Host "1. Push this code to GitHub" -ForegroundColor White
Write-Host "2. Connect your GitHub repo to Railway" -ForegroundColor White
Write-Host "3. Set FAL_KEY environment variable in Railway dashboard" -ForegroundColor White
Write-Host ""
Write-Host "Happy deploying! 🎉" -ForegroundColor Green
