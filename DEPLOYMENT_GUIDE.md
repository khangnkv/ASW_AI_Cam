# Deployment Guide: Netlify Frontend + Railway Backend

## Overview
This setup deploys:
- **Frontend (React)** → Netlify (static hosting)
- **Backend (Express API)** → Railway (Node.js hosting)

## Step 1: Deploy Backend to Railway

1. **Create Railway Account**: Go to [railway.app](https://railway.app)

2. **Deploy Backend**:
   ```bash
   # Option A: GitHub Integration
   - Push your code to GitHub
   - Connect GitHub repo to Railway
   - Railway will auto-detect and deploy the backend
   
   # Option B: Railway CLI
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

3. **Set Environment Variables in Railway**:
   ```
   FAL_KEY=your_fal_ai_api_key_here
   NODE_ENV=production
   PORT=3000
   ```

4. **Get Railway Backend URL**:
   - After deployment, Railway will provide a URL like:
   - `https://your-app-name.railway.app`
   - Copy this URL for Step 2

## Step 2: Configure Frontend for Netlify

1. **Set Environment Variable in Netlify**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-railway-backend-url.railway.app`

2. **Deploy to Netlify**:
   ```bash
   # The frontend is already deployed, just redeploy with new env var
   # Netlify will automatically rebuild when you update environment variables
   ```

## Step 3: Test the Integration

1. **Check Backend Health**:
   ```bash
   curl https://your-railway-backend-url.railway.app/health
   ```

2. **Test Frontend**:
   - Visit your Netlify URL: `https://majestic-trifle-1309e2.netlify.app`
   - Try generating an image
   - Check browser console for any CORS or API errors

## Troubleshooting

### CORS Issues
If you get CORS errors, update `backend/server.js`:
```javascript
app.use(cors({
  origin: [
    'https://your-netlify-site.netlify.app',
    'https://majestic-trifle-1309e2.netlify.app'
  ],
  credentials: true
}));
```

### API Not Found (404)
- Verify `VITE_API_URL` is set correctly in Netlify
- Check Railway backend is running: visit `/health` endpoint
- Ensure Railway backend includes `/api` routes

### Environment Variables
- **Netlify**: Set `VITE_API_URL` in dashboard
- **Railway**: Set `FAL_KEY`, `NODE_ENV`, `PORT`

## Local Development

```bash
# Backend (Terminal 1)
cd backend
npm install
npm start  # Runs on http://localhost:3001

# Frontend (Terminal 2)
npm install
npm run dev  # Runs on http://localhost:5173
```

## Production URLs
- **Frontend**: https://majestic-trifle-1309e2.netlify.app
- **Backend**: https://your-railway-app.railway.app (set this in Netlify env vars)

## Quick Deploy Commands

```bash
# Deploy backend to Railway
railway login
railway link  # or railway init for new project
railway up

# Frontend auto-deploys to Netlify on git push
git add .
git commit -m "Update API configuration"
git push origin main
```