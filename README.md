# Ghibli Portrait Generator

An AI-powered web application that transforms your portrait photos into beautiful Studio Ghibli-style artwork using cutting-edge AI technology.

## Features

- **Camera Integration**: Take photos directly from your device camera
- **AI-Powered Processing**: Transform portraits using Fal-AI's Flux Pro model
- **Beautiful UI**: Responsive, mobile-first design with Ghibli-inspired aesthetics
- **Instant Results**: View and download your transformed portrait
- **Cross-Platform**: Works on desktop, tablet, and mobile devices
- **Railway Ready**: Optimized for single-service deployment on Railway

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- WebRTC for camera access

### Backend
- Node.js with Express
- Multer for file uploads
- Axios for API requests
- Fal-AI Flux Pro integration

### Infrastructure
- **Railway Deployment**: Single-service architecture optimized for Railway
- **Docker Support**: Multi-stage builds for efficient deployments
- **Local Development**: Docker Compose for multi-service local development
- Docker & Docker Compose
- Nginx reverse proxy
- Health checks and monitoring
- Multi-stage builds for optimization

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose (for containerized deployment)
- Fal-AI API key (get from https://fal.ai/models/fal-ai/flux-pro)

## Quick Start (Docker - Recommended)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ghibli-portrait-generator
```

### 2. Configure Environment Variables

Copy the environment template and add your API key:
```bash
cp .env.example .env
```

Edit the `.env` file and add your Fal-AI API key:
```
FAL_KEY=your_fal_ai_api_key_here
```

### 3. Start with Docker

Build and run the entire application:
```bash
docker-compose up --build
```

The application will be available at `http://localhost` (port 80).

### 4. Stop the Application

```bash
docker-compose down
```

## Local Development (Without Docker)

If you prefer to run the application locally for development:

### 1. Environment Setup

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Add your Fal-AI API key to both `.env` files.

### 2. Install Dependencies

#### Frontend
```bash
npm install
npm run dev
```

#### Backend
```bash
cd backend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` and backend at `http://localhost:3001`.

## Production Deployment

### Docker Compose (Recommended)

```bash
# Clone and setup
git clone <repository-url>
cd ghibli-portrait-generator

# Configure environment
cp .env.example .env
# Edit .env and add your FAL_KEY

# Deploy
docker-compose up --build
```

### Platform-Specific Deployment

#### Fly.io
```bash
# Install Fly CLI and login
fly auth login

# Create app
fly apps create your-app-name

# Set environment variables
fly secrets set FAL_KEY=your_fal_ai_api_key_here

# Deploy
fly deploy
```

#### Render
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set environment variable: `FAL_KEY=your_fal_ai_api_key_here`
4. Deploy automatically from your repository

#### Railway
```bash
# Install Railway CLI and login
railway login

# Create project
railway init

# Set environment variables
railway variables set FAL_KEY=your_fal_ai_api_key_here

# Deploy
railway up
```

## API Endpoints

### `POST /api/generate`
Transform a portrait image into Ghibli-style artwork.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (file) - Portrait image (JPEG/PNG, max 10MB)

**Response:**
```json
{
  "success": true,
  "ghibliImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "message": "Image processed successfully"
}
```

### `GET /health`
Health check endpoint for monitoring.

## Project Structure

```
ghibli-portrait-generator/
├── src/                    # Frontend source code
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # React entry point
│   └── index.css          # Global styles
├── backend/               # Backend source code
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── Dockerfile         # Backend container config
├── docker-compose.yml     # Multi-container orchestration
├── nginx.conf            # Nginx proxy configuration
├── nginx-frontend.conf   # Frontend nginx configuration
├── Dockerfile            # Frontend container config
├── .dockerignore         # Docker ignore rules
└── README.md             # This file
```

## Configuration

### Environment Variables

#### Root .env (for Docker Compose)
```
FAL_KEY=your_fal_ai_api_key_here
```

#### Backend (backend/.env)
```
FAL_KEY=your_fal_ai_api_key_here
PORT=3001
NODE_ENV=production
```

### Docker Configuration

The application uses optimized multi-stage Docker builds:

- **Frontend**: Built with Node.js, served with Nginx for optimal performance
- **Backend**: Optimized Node.js runtime with Express server
- **Nginx**: Reverse proxy for routing and load balancing

### Performance Optimizations

- **Multi-stage builds**: Smaller production images
- **Nginx compression**: Gzip compression for faster loading
- **Static asset caching**: Optimized cache headers
- **Health checks**: Automatic service monitoring
- **Security headers**: Enhanced security configuration

## Deployment Options

### 1. Docker Compose (Production)
```bash
cp .env.example .env
# Add your FAL_KEY to .env
docker-compose up --build
```

### 2. Local Development
```bash
# Frontend
npm run dev

# Backend (separate terminal)
cd backend && npm run dev
```

### 3. Cloud Deployment
```bash
# See platform-specific instructions above
# Supports Fly.io, Render, Railway, and others
```

## Usage

1. **Start**: Click "Start Camera" to begin
2. **Position**: Center your face in the camera frame
3. **Capture**: Take a photo when ready
4. **Process**: Wait for AI transformation (30-60 seconds)
5. **Download**: Save your Ghibli-style portrait

## Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Check if other applications are using the camera
- Try refreshing the page

### API Errors
- Verify your Fal-AI API key is correct
- Check network connectivity
- Ensure the backend service is running

### Docker Issues
- Ensure Docker daemon is running
- Check port availability (80, 3000, 3001)
- Verify environment variables are set
- Check logs: `docker-compose logs [service-name]`

### Common Docker Commands
```bash
# View logs
docker-compose logs frontend
docker-compose logs backend

# Restart services
docker-compose restart

# Rebuild specific service
docker-compose up --build frontend

# Clean up
docker-compose down --volumes --rmi all
```

## Performance Optimization

- Images are processed in-memory (no permanent storage)
- Optimized bundle splitting for faster loading
- Responsive images for different screen sizes
- Health checks for service monitoring
- Nginx compression and caching
- Multi-stage Docker builds for smaller images

## Security Considerations

- No permanent image storage
- API key stored as environment variable
- CORS enabled for cross-origin requests
- Input validation for uploaded images
- Security headers in Nginx configuration
- Non-root user in Docker containers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the Docker logs: `docker-compose logs`
3. Open an issue on GitHub

---

**Note**: This application requires a valid Fal-AI API key for image processing. Visit https://fal.ai/models/fal-ai/flux-pro to get your API key.