# ASW AI Cam - Comprehensive Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Main Files & Responsibilities](#main-files--responsibilities)
4. [Component Breakdown](#component-breakdown)
5. [API Documentation](#api-documentation)
6. [Docker & Deployment](#docker--deployment)
7. [Configuration Files](#configuration-files)
8. [Obsolete Code Identification](#obsolete-code-identification)
9. [Future-Proofing Notes](#future-proofing-notes)
10. [Development Workflow](#development-workflow)

---

## 🚀 Project Overview

**ASW AI Cam** is a full-stack AI-powered web application that transforms portrait photos into Studio Ghibli-style artwork and provides advanced face-swap functionality. The application uses cutting-edge AI models from FAL.ai to deliver instant, high-quality transformations.

### Key Features
- 📸 **Camera Integration**: Direct photo capture from device camera
- 🎨 **AI Style Transfer**: Studio Ghibli-style transformations using Flux Pro model
- 👥 **Face Swap**: Advanced face replacement using Easel AI model
- 📱 **Mobile-First Design**: Responsive UI optimized for all devices
- 🔗 **QR Code Generation**: Share results via QR codes
- ☁️ **Cloud Deployment**: Separated frontend (Netlify) and backend (Railway)

### Tech Stack Summary
- **Frontend**: React 18.3.1 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js 18 + Express 4.18.2 + FAL.ai Client
- **AI Models**: FAL.ai Flux Pro, Easel AI Advanced Face Swap
- **Deployment**: Railway (Backend), Netlify (Frontend), Docker containerization
- **File Handling**: Multer, Base64 encoding, in-memory storage

---

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   FAL.ai API    │
│   (Netlify)     │◄──►│   (Railway)     │◄──►│   (External)    │
│                 │    │                 │    │                 │
│ React + Vite    │    │ Express + Node  │    │ AI Models       │
│ Camera API      │    │ Multer Upload   │    │ Flux Pro        │
│ Image Capture   │    │ CORS Config     │    │ Face Swap       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Request Flow
1. **User Interaction**: Camera capture or file upload in React frontend
2. **API Request**: Frontend sends image data to Railway backend
3. **AI Processing**: Backend forwards request to FAL.ai models
4. **Response**: Generated image returned with QR code for sharing

---

## 📁 Main Files & Responsibilities

### Core Application Files

#### `src/App.tsx` (778 lines)
**Primary React Component - UI State Management**
- **Responsibilities**:
  - Camera integration and photo capture
  - Feature selection (AI Style, Custom, Face Swap)
  - Image processing workflow management
  - Result display and download functionality
- **Key State Variables**:
  - `state`: Application flow state ('welcome' | 'camera' | 'preview' | 'processing' | 'result')
  - `selectedFeature`: Current AI feature selection
  - `capturedImage`: Base64 encoded captured photo
  - `result`: Generated image and metadata
- **Key Functions**:
  - `startCamera()`: Initialize device camera access
  - `capturePhoto()`: Take photo and convert to base64
  - `generateImage()`: Send API request for AI processing
  - `handleFaceSwap()`: Manage face swap functionality

#### `backend/server.js` (611 lines)
**Express Backend Server - API Gateway**
- **Responsibilities**:
  - FAL.ai API integration and authentication
  - File upload handling via Multer
  - CORS configuration for cross-origin requests
  - Health check endpoints for Railway deployment
  - QR code generation for sharing
- **Key Endpoints**:
  - `POST /api/generate`: AI style transfer and custom prompts
  - `POST /api/face-swap`: Advanced face replacement
  - `GET /health`: Railway health check
  - `GET /`: Static file serving fallback
- **Key Dependencies**:
  - `@fal-ai/client`: AI model integration
  - `multer`: File upload middleware
  - `qrcode`: QR code generation
  - `cors`: Cross-origin resource sharing

### Configuration Files

#### `src/config/api.ts`
**API Configuration Management**
```typescript
// src/config/api.ts - CREATE THIS FILE
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000'
  },
  production: {
    baseURL: 'https://aswaicam-production.up.railway.app'
  }
};

const isDevelopment = window.location.hostname === 'localhost';
export const API_BASE_URL = API_CONFIG[isDevelopment ? 'development' : 'production'].baseURL;
```

#### `package.json` (Root)
**Project Dependencies and Scripts**
- Version: 2.0.0
- Build tool: Vite 5.4.2
- React version: 18.3.1
- Key scripts: `dev`, `build`, `start`, `preview`

#### `backend/package.json`
**Backend-Specific Dependencies**
- Focused on server-side packages only
- Production-ready dependency list
- Start script: `node server.js`

### Deployment Files

#### `Dockerfile.railway`
**Railway-Specific Docker Configuration**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/ ./
RUN npm ci --only=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
```

#### `railway.json`
**Railway Deployment Configuration**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway"
  },
  "deploy": {
    "startCommand": "node backend/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### `netlify.toml`
**Netlify Frontend Deployment**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🧩 Component Breakdown

### React Component Architecture

#### Main App Component (`App.tsx`)
**State Management Pattern: Hooks-based**

**State Variables:**
```typescript
const [state, setState] = useState<AppState>('welcome');
const [selectedFeature, setSelectedFeature] = useState<FeatureType>('ai-style');
const [capturedImage, setCapturedImage] = useState<string | null>(null);
const [result, setResult] = useState<ProcessingResult | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
```

**UI Flow States:**
1. **Welcome Screen**: Feature selection and camera initialization
2. **Camera View**: Live camera feed with capture controls
3. **Preview**: Confirm captured image before processing
4. **Processing**: Loading state during AI generation
5. **Result**: Display generated image with download/share options

**Key Hooks Used:**
- `useState`: Component state management
- `useRef`: DOM element references (video, canvas, file input)
- `useCallback`: Optimized function memoization
- `useEffect`: Side effects and cleanup

#### Feature Selection Component
**Three AI Features Supported:**
```typescript
const features: FeatureOption[] = [
  {
    id: 'ai-style',
    name: 'AI Style', 
    icon: Palette,
    description: 'Template-based styling'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Type, 
    description: 'Your own prompt'
  },
  {
    id: 'face-swap',
    name: 'Face Swap',
    icon: Users,
    description: 'Advanced face replacement'
  }
];
```

### Backend API Structure

#### Express Server Setup
**Middleware Stack:**
1. **CORS**: Multi-origin support for Netlify + Railway
2. **Express JSON**: Request body parsing
3. **Multer**: File upload handling
4. **Static**: Fallback file serving

**Error Handling Pattern:**
```javascript
// Consistent error response format
res.status(500).json({
  error: 'Processing failed',
  details: error.message,
  timestamp: new Date().toISOString()
});
```

#### AI Model Integration
**FAL.ai Client Configuration:**
```javascript
fal.config({
  credentials: process.env.FAL_KEY,
});

// AI Style Generation
const result = await fal.subscribe("fal-ai/flux-pro", {
  input: {
    prompt: enhancedPrompt,
    image_url: imageUrl,
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: "jpeg",
    output_quality: 80
  }
});

// Face Swap Generation
const result = await fal.subscribe("fal-ai/easel-ai/advanced-face-swap", {
  input: {
    source_image: sourceBlob,
    target_image: targetBlob,
    options: faceSwapOptions
  }
});
```

---

## 🔌 API Documentation

### Backend Endpoints

#### `POST /api/generate`
**AI Style Transfer and Custom Prompts**

**Request Body:**
```typescript
{
  image: string;           // Base64 encoded image
  feature: 'ai-style' | 'custom';
  prompt?: string;         // Required for custom feature
}
```

**Response:**
```typescript
{
  success: boolean;
  generatedImage: string;  // Base64 encoded result
  publicImageUrl: string;  // FAL.ai direct URL
  qrCode: string;         // Base64 QR code for sharing
  feature: string;
  timestamp: string;
  message: string;
}
```

**AI Style Prompts:**
```javascript
const aiStylePrompts = [
  "Studio Ghibli anime style portrait, soft watercolor painting",
  "Miyazaki-inspired character design with gentle expression", 
  "Whimsical anime portrait in the style of Spirited Away",
  "Dreamy Studio Ghibli artwork with pastoral background"
];
```

#### `POST /api/face-swap`
**Advanced Face Replacement**

**Request Body (FormData):**
```typescript
{
  sourceImage: File;       // Source image file
  targetImage: File;       // Target face image file
  gender_0: 'male' | 'female';
  workflow_type: 'user_hair' | 'target_hair';
  upscale: boolean;
}
```

**Response:** Same format as `/api/generate`

#### `GET /health`
**Railway Health Check Endpoint**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  }
}
```

### Frontend API Integration

#### API Configuration (`src/config/api.ts`)
**Environment-based URL Selection:**
```typescript
// src/config/api.ts - CREATE THIS FILE
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3000'
  },
  production: {
    baseURL: 'https://aswaicam-production.up.railway.app'
  }
};

const isDevelopment = window.location.hostname === 'localhost';
export const API_BASE_URL = API_CONFIG[isDevelopment ? 'development' : 'production'].baseURL;
```

#### Error Handling Pattern
**Consistent Error Management:**
```typescript
try {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  // Handle success
} catch (error) {
  console.error('API Error:', error);
  setError(error.message);
}
```

---

## 🐳 Docker & Deployment

### Railway Backend Deployment

#### `Dockerfile.railway`
**Single-Stage Build for Production:**
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy only backend files
COPY backend/ ./

# Install production dependencies only
RUN npm ci --only=production

# Expose port
EXPOSE 3000

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server.js"]
```

**Key Design Decisions:**
- **Alpine Linux**: Minimal image size (~150MB vs ~900MB for full Node)
- **Production Dependencies Only**: Faster builds, smaller images
- **Health Check Integration**: Railway-compatible monitoring
- **Backend-Only Copy**: Excludes frontend files for cleaner deployment

#### Railway Configuration (`railway.json`)
**Deployment Settings:**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.railway"
  },
  "deploy": {
    "startCommand": "node backend/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables Required:**
- `FAL_KEY`: FAL.ai API authentication token
- `NODE_ENV`: Set to "production"
- `PORT`: Automatically provided by Railway

### Netlify Frontend Deployment

#### `netlify.toml`
**SPA Configuration:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Build Process:**
1. Install dependencies: `npm ci`
2. Build frontend: `npm run build` (Vite)
3. Deploy `dist/` folder to Netlify CDN
4. Configure SPA routing redirects

### Development vs Production

#### Local Development Setup
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend  
npm install
npm run dev
```

#### Production Deployment Flow
```bash
# Backend (Railway)
git push origin main
→ Railway auto-deploys from Dockerfile.railway
→ Health checks verify deployment

# Frontend (Netlify)
git push origin main  
→ Netlify auto-builds and deploys
→ CDN distribution worldwide
```

---

## ⚙️ Configuration Files

### Build Configuration

#### `vite.config.ts`
**Frontend Build Tool Configuration**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
});
```

#### `tailwind.config.js`
**CSS Framework Configuration**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### `tsconfig.json`
**TypeScript Configuration**
- Strict mode enabled
- ES2020 target
- React JSX transform
- Path mapping for cleaner imports

### Environment Configuration

#### `.env` File Structure
```bash
# Backend Environment Variables
FAL_KEY=your_fal_ai_api_key_here
NODE_ENV=production
PORT=3000

# Frontend automatically detects NODE_ENV
# No additional environment variables needed
```

#### Development vs Production Settings
**Development:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:3000` (Express server)
- CORS: Allows localhost origins

**Production:**
- Frontend: `https://[your-app].netlify.app`
- Backend: `https://aswaicam-production.up.railway.app`
- CORS: Configured for Netlify + Railway domains

---

## 🗑️ Obsolete Code Identification

### Files That Can Be Removed

#### ❌ `docker-compose.yml`
**Status: Obsolete**
- **Reason**: Originally for local multi-container development
- **Current State**: Not used in production deployment
- **Recommendation**: Remove or move to `docs/legacy/`

#### ❌ `Dockerfile` (Root Level)
**Status: Obsolete**  
- **Reason**: Replaced by `Dockerfile.railway` for production
- **Current State**: Not referenced in deployment
- **Recommendation**: Remove to avoid confusion

#### ❌ `nginx.conf`
**Status: Obsolete**
- **Reason**: Nginx not used in current Netlify + Railway architecture  
- **Current State**: No reverse proxy needed
- **Recommendation**: Remove unless planning future nginx deployment

### Potentially Unused Code Sections

#### 🔍 In `src/App.tsx`
**Logo Error Handling:**
```typescript
const [logoError, setLogoError] = useState(false);
// This state is set but never used in current UI
```

**Recommendation**: Remove if no logo is displayed

#### 🔍 In `backend/server.js`
**Static File Serving:**
```javascript
app.use(express.static(path.join(__dirname, '../dist')));
// Not needed since frontend is deployed separately
```

**Recommendation**: Remove static serving code for cleaner backend

### Code Cleanup Opportunities

#### 1. Console.log Statements
**Current State**: Extensive logging throughout codebase
**Recommendation**: 
- Keep error logs and critical debug info
- Remove verbose development logs
- Implement proper logging levels

#### 2. Commented Code Blocks
**Location**: Various files contain commented-out code
**Recommendation**: Remove commented code blocks that are no longer relevant

#### 3. Unused Dependencies
**Check these packages:**
```bash
# Run dependency analysis
npm audit
npx depcheck  # Install with: npm install -g depcheck
```

---

## 🔮 Future-Proofing Notes

### Scalability Considerations

#### 1. Database Integration
**Current State**: In-memory image storage
**Future Enhancement**: 
```typescript
// Recommended: MongoDB or PostgreSQL integration
interface ImageRecord {
  id: string;
  userId?: string;
  originalImage: string;
  generatedImage: string;
  feature: FeatureType;
  prompt?: string;
  createdAt: Date;
  metadata: {
    processingTime: number;
    modelUsed: string;
    fileSize: number;
  };
}
```

#### 2. User Authentication
**Current State**: No user system
**Future Enhancement**:
```typescript
// Add user context
interface User {
  id: string;
  email: string;
  subscription: 'free' | 'premium';
  imageCredits: number;
  createdAt: Date;
}

// Update API endpoints
app.post('/api/generate', authenticateUser, generateImage);
```

#### 3. Rate Limiting & Quotas
**Current State**: No limits
**Future Enhancement**:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

### New Feature Integration

#### 1. Additional AI Models
**Extension Pattern:**
```typescript
// Add new models to features array
const features: FeatureOption[] = [
  // ...existing features
  {
    id: 'anime-style',
    name: 'Anime Style',
    icon: Sparkles,
    description: 'Anime character transformation',
    model: 'fal-ai/anime-character-generator'
  },
  {
    id: 'realistic-portrait',
    name: 'Realistic',
    icon: Camera,
    description: 'Photorealistic enhancement',
    model: 'fal-ai/realistic-vision'
  }
];
```

#### 2. Batch Processing
**Implementation Strategy:**
```typescript
// Add batch endpoint
app.post('/api/batch-generate', async (req, res) => {
  const { images, feature, options } = req.body;
  
  const results = await Promise.all(
    images.map(image => processImage(image, feature, options))
  );
  
  res.json({ results });
});
```

#### 3. Real-time Updates
**WebSocket Integration:**
```javascript
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL }
});

// Real-time processing updates
io.on('connection', (socket) => {
  socket.on('start-processing', async (data) => {
    socket.emit('processing-status', { stage: 'uploading' });
    // ... processing steps with status updates
    socket.emit('processing-complete', { result });
  });
});
```

### Performance Optimizations

#### 1. Image Compression
**Current State**: Basic JPEG output
**Enhancement**:
```javascript
const sharp = require('sharp');

// Optimize images before processing
const optimizeImage = async (buffer) => {
  return await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
};
```

#### 2. Caching Strategy
**Redis Integration:**
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache frequent requests
const getCachedResult = async (imageHash, feature) => {
  const cached = await client.get(`result:${imageHash}:${feature}`);
  return cached ? JSON.parse(cached) : null;
};
```

#### 3. CDN Integration
**Asset Optimization:**
```typescript
// Configure CDN for generated images
const uploadToCDN = async (imageBuffer: Buffer) => {
  // Upload to Cloudinary, AWS S3, or similar
  return {
    publicUrl: 'https://cdn.example.com/generated/image-id.jpg',
    thumbnailUrl: 'https://cdn.example.com/generated/thumb-id.jpg'
  };
};
```

### Monitoring & Analytics

#### 1. Application Monitoring
**Recommended Tools:**
- **Error Tracking**: Sentry integration
- **Performance**: New Relic or DataDog
- **Uptime**: Railway built-in + external monitoring

#### 2. Usage Analytics
**Implementation:**
```typescript
// Track feature usage
interface AnalyticsEvent {
  event: 'image_generated' | 'feature_selected' | 'error_occurred';
  feature?: FeatureType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const trackEvent = (event: AnalyticsEvent) => {
  // Send to analytics service (Google Analytics, Mixpanel, etc.)
};
```

#### 3. Health Monitoring
**Enhanced Health Checks:**
```javascript
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      fal_ai: await checkFALConnection(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  res.json(health);
});
```

---

## 🔄 Development Workflow

### Getting Started

#### 1. Prerequisites
```bash
# Required software
Node.js 18+ 
npm 8+
Git

# Optional but recommended
Docker Desktop
VS Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - TypeScript Hero
```

#### 2. Environment Setup
```bash
# Clone repository
git clone <repository-url>
cd ASW_AI_Cam

# Install dependencies
npm install
cd backend && npm install && cd ..

# Environment configuration
cp .env.example .env
# Add your FAL_KEY to .env file

# Start development servers
npm run dev          # Frontend (port 5173)
npm run start        # Backend (port 3000)
```

### Code Standards

#### 1. TypeScript Configuration
- Strict mode enabled
- No implicit any
- Unused locals error
- Consistent import/export patterns

#### 2. Linting Rules
```json
// eslint.config.js
{
  "extends": ["@eslint/js", "react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

#### 3. File Organization
```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks  
├── utils/              # Helper functions
├── types/              # TypeScript type definitions
├── config/             # Configuration files
└── assets/             # Static assets
```

### Testing Strategy

#### 1. Unit Tests (Recommended Addition)
```typescript
// Example test structure
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders welcome screen initially', () => {
    render(<App />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
  
  it('handles camera initialization', async () => {
    // Mock navigator.mediaDevices
    // Test camera flow
  });
});
```

#### 2. API Testing
```javascript
// Backend API tests
const request = require('supertest');
const app = require('./server');

describe('API Endpoints', () => {
  test('POST /api/generate returns generated image', async () => {
    const response = await request(app)
      .post('/api/generate')
      .send({
        image: 'base64-image-data',
        feature: 'ai-style'
      });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('generatedImage');
  });
});
```

### Deployment Checklist

#### Pre-deployment
- [ ] All environment variables configured
- [ ] Dependencies updated and audited
- [ ] Code linted and formatted
- [ ] Console.log statements reviewed
- [ ] Error handling tested
- [ ] CORS settings verified

#### Post-deployment
- [ ] Health check endpoints responding
- [ ] AI model integration working
- [ ] Image generation successful
- [ ] QR code functionality tested
- [ ] Mobile responsiveness verified

---

## 📞 Support & Maintenance

### Common Issues & Solutions

#### 1. Camera Access Denied
**Symptoms**: Camera not initializing, permissions error
**Solutions**:
- Verify HTTPS in production (required for camera API)
- Check browser permissions settings
- Test with different devices/browsers

#### 2. CORS Errors
**Symptoms**: API requests blocked in browser
**Solutions**:
- Verify frontend URL in backend CORS config
- Check Railway and Netlify deployment URLs
- Ensure proper environment variable configuration

#### 3. FAL.ai API Errors
**Symptoms**: Image generation failing
**Solutions**:
- Verify FAL_KEY environment variable
- Check API quota and billing status
- Monitor FAL.ai service status

### Maintenance Tasks

#### Weekly
- [ ] Check Railway deployment health
- [ ] Monitor error logs
- [ ] Review API usage statistics

#### Monthly  
- [ ] Update dependencies
- [ ] Security audit with `npm audit`
- [ ] Performance monitoring review
- [ ] Backup critical configurations

#### Quarterly
- [ ] Major dependency updates
- [ ] Performance optimization review
- [ ] User feedback implementation
- [ ] Architecture review for scaling needs

---

*This documentation is living and should be updated as the project evolves. Last updated: January 2024*
