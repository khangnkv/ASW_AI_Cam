# Railway Deployment Guide

This guide covers deploying the Ghibli Portrait Generator as a single service on Railway.

## Overview

The Railway deployment combines both frontend and backend into a single service using:
- `railway-server.js` - Combined Express server serving both React frontend and API
- `Dockerfile.railway` - Multi-stage Docker build optimized for Railway
- `railway.json` - Railway-specific configuration

## Architecture

```
Railway Service
├── Frontend (React/Vite) - Served as static files
├── Backend (Express/Node) - API endpoints
└── Single process serving both on the same port
```

## Quick Deploy to Railway

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add Railway single-service deployment"
   git push origin main
   ```

2. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect the `railway.json` configuration

3. **Set Environment Variables:**
   ```
   FAL_KEY=your_fal_api_key_here
   NODE_ENV=production
   ```

4. **Deploy:**
   Railway will automatically build using `Dockerfile.railway` and start the service.

### Option 2: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway link  # Link to existing project or create new
   railway up    # Deploy
   ```

## Local Development

### Test Railway Build Locally

```bash
# Build the Docker image
docker build -f Dockerfile.railway -t ghibli-railway .

# Run locally (same as Railway environment)
docker run -p 3000:3000 -e FAL_KEY=your_key_here ghibli-railway
```

### Development with Hot Reload

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# In another terminal, start backend
cd backend
npm start
```

## File Structure (Railway Deployment)

```
├── railway-server.js          # 🔥 Combined server (frontend + backend)
├── Dockerfile.railway         # 🔥 Railway-optimized Docker build
├── railway.json              # 🔥 Railway configuration
├── package.json              # 🔥 Combined dependencies
├── dist/                     # Built frontend (created during build)
├── src/                      # React frontend source
├── backend/                  # Original backend (reference only)
└── docs/                     # Documentation
```

## How It Works

1. **Build Phase:** 
   - `npm run build` creates the React production build in `dist/`
   - Docker copies the built frontend to the container

2. **Runtime:**
   - `railway-server.js` starts an Express server
   - Serves React app from `dist/` directory
   - Handles API requests at `/api/*` endpoints
   - All requests go to the same port (Railway requirement)

## Environment Variables

Required:
- `FAL_KEY` - Your FAL.ai API key

Optional:
- `NODE_ENV` - Set to "production" (auto-set by Railway)
- `PORT` - Port number (auto-set by Railway)

## Endpoints

- `GET /` - React frontend (SPA)
- `GET /health` - Health check endpoint
- `POST /api/generate` - Image generation API
- `GET /*` - All other routes serve React app (client-side routing)

## Troubleshooting

### Build Fails

```bash
# Check if build works locally
npm run build

# Check Docker build
docker build -f Dockerfile.railway -t test .
```

### Runtime Issues

```bash
# Check logs on Railway
railway logs

# Check health endpoint
curl https://your-app.railway.app/health
```

### API Not Working

1. Verify `FAL_KEY` is set in Railway environment variables
2. Check CORS settings in `railway-server.js`
3. Ensure API calls use relative URLs (e.g., `/api/generate`)

## Differences from Multi-Service Setup

| Multi-Service (Docker Compose) | Single-Service (Railway) |
|--------------------------------|--------------------------|
| Frontend: Port 3000, Backend: Port 3001 | Everything on one port |
| Nginx reverse proxy | Express serves static files |
| Two containers | One container |
| Complex networking | Simple single-process |

## Migration from Multi-Service

If you were using the Docker Compose setup:

1. **Frontend changes:**
   - Update API calls to use relative URLs: `/api/generate` instead of `http://localhost:3001/api/generate`
   - Remove proxy configuration from `vite.config.ts` for production builds

2. **Backend changes:**
   - No changes needed to `backend/server.js`
   - `railway-server.js` contains the combined logic

3. **Environment:**
   - Use `railway.json` instead of `docker-compose.yml`
   - Set environment variables in Railway dashboard

## Performance Considerations

- **Cold Starts:** Railway may sleep inactive services. Health checks help with this.
- **Memory:** Single container uses less memory than multi-service setup.
- **Scaling:** Railway handles horizontal scaling automatically.

## Security Notes

- CORS is configured for Railway domains (`*.railway.app`)
- Non-root user in Docker for security
- Environment variables are secure in Railway
- No sensitive data in the Docker image

## Support

- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- Check `railway logs` for debugging
