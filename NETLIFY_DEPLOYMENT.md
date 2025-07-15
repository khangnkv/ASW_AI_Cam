# Netlify Deployment Guide

This guide covers deploying the AssetWise AI Generator frontend to Netlify while connecting to the Railway backend.

## Prerequisites

1. ✅ Railway backend deployed and running
2. ✅ GitHub repository with your code
3. ✅ Netlify account (free tier works)

## Quick Deploy Steps

### Option 1: GitHub Integration (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Deploy on Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Select your repository
   - Netlify will auto-detect the build settings from `netlify.toml`

3. **Verify deployment:**
   - Build command: `npm run build` ✅
   - Publish directory: `dist` ✅
   - Node version: 18 ✅

### Option 2: Drag & Drop Deploy

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder to the deploy area
   - Your site will be live instantly

## Configuration Details

### Backend Connection

The frontend is configured to connect to your Railway backend:

```typescript
// src/config/api.ts
const API_CONFIG = {
  production: {
    baseURL: 'https://aswaicam-production.up.railway.app'
  }
};
```

### Netlify Configuration

The `netlify.toml` file handles:

1. **API Proxying:**
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://aswaicam-production.up.railway.app/api/:splat"
     status = 200
     force = true
   ```

2. **SPA Routing:**
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

3. **Performance Headers:**
   - Caching for static assets
   - Security headers
   - CORS support

## Verification Steps

After deployment, verify everything works:

### 1. Check Frontend
- ✅ Site loads at your Netlify URL
- ✅ Camera access works
- ✅ UI is responsive

### 2. Check Backend Connection
- ✅ Open browser dev tools
- ✅ Try generating an image
- ✅ Check Network tab for API calls to Railway

### 3. Test Full Flow
- ✅ Take a photo
- ✅ Generate AI image
- ✅ Download works
- ✅ QR code functions

## Troubleshooting

### Build Fails
```bash
# Check build locally first
npm run build

# Common issues:
# - Missing dependencies: npm install
# - TypeScript errors: Fix in code
# - Environment variables: Check Netlify settings
```

### API Calls Fail
1. **Check Railway backend is running:**
   ```bash
   curl https://aswaicam-production.up.railway.app/health
   ```

2. **Check CORS settings:**
   - Ensure your Netlify domain is in backend CORS config
   - Check browser console for CORS errors

3. **Check API configuration:**
   - Verify `src/config/api.ts` has correct Railway URL
   - Check network tab in browser dev tools

### Common Issues

| Issue | Solution |
|-------|----------|
| 404 on refresh | ✅ Already configured in `netlify.toml` |
| API calls fail | Check Railway backend URL and CORS |
| Build timeout | Increase build timeout in Netlify settings |
| Large bundle | Already optimized with Vite |

## Custom Domain (Optional)

1. **Add custom domain in Netlify:**
   - Site settings → Domain management
   - Add custom domain

2. **Update backend CORS:**
   ```javascript
   // Add your domain to CORS allowedOrigins
   'https://yourdomain.com'
   ```

## Environment Variables

Netlify automatically detects the environment:
- `NODE_ENV=production` (auto-set)
- No additional env vars needed for frontend

## Performance Optimizations

Already configured:
- ✅ Gzip compression
- ✅ Asset caching (1 year)
- ✅ HTML caching (1 hour)
- ✅ Security headers
- ✅ Optimized bundle splitting

## Monitoring

### Netlify Analytics
- Enable in Site settings → Analytics
- Track page views, performance

### Error Monitoring
- Check Netlify Functions logs
- Monitor Railway backend logs
- Use browser dev tools

## Deployment Commands

```bash
# Manual deploy via CLI (optional)
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## Next Steps

1. **Custom Domain:** Add your own domain
2. **Analytics:** Enable Netlify Analytics
3. **Forms:** Add contact forms if needed
4. **Edge Functions:** Add serverless functions if needed

## Support

- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)
- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **Project Issues:** Check GitHub issues

---

**Your deployment URLs:**
- Frontend: `https://your-site-name.netlify.app`
- Backend: `https://aswaicam-production.up.railway.app`
- Health Check: `https://aswaicam-production.up.railway.app/health`