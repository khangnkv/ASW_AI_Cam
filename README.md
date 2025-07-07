# Ghibli Portrait Generator

An AI-powered web application that transforms your portrait photos into beautiful Studio Ghibli-style artwork using cutting-edge AI technology.

## Features

- **Camera Integration**: Take photos directly from your device camera
- **AI-Powered Processing**: Transform portraits using Fal-AI's Flux Pro model
- **Beautiful UI**: Responsive, mobile-first design with Ghibli-inspired aesthetics
- **Instant Results**: View and download your transformed portrait
- **Cross-Platform**: Works on desktop, tablet, and mobile devices
- **Docker Support**: Easy deployment with Docker containers

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
- Docker & Docker Compose
- Nginx reverse proxy
- Health checks and monitoring

## Prerequisites

- Node.js 18 or higher
- Docker and Docker Compose (for containerized deployment)
- Fal-AI API key (get from https://fal.ai/models/fal-ai/flux-pro)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ghibli-portrait-generator
```

### 2. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edit both `.env` files and add your Fal-AI API key:
```
FAL_KEY=your_fal_ai_api_key_here
```

### 3. Local Development

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

Visit `http://localhost:5173` to use the application.

### 4. Docker Deployment

Build and run with Docker Compose:
```bash
docker-compose up --build
```

The application will be available at `http://localhost:80`.

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
├── Dockerfile            # Frontend container config
└── README.md             # This file
```

## Configuration

### Environment Variables

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

#### Backend (backend/.env)
```
FAL_KEY=your_fal_ai_api_key_here
PORT=3001
NODE_ENV=production
```

### Docker Configuration

The application uses multi-stage Docker builds for optimization:

- **Frontend**: Built with Node.js, served with nginx
- **Backend**: Node.js runtime with Express server
- **Nginx**: Reverse proxy for routing and load balancing

## Deployment Options

### 1. Local Development
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend  
cd backend && npm run dev
```

### 2. Docker Compose (Recommended)
```bash
docker-compose up --build
```

### 3. Production Deployment
```bash
# Build for production
npm run build
cd backend && npm install --production

# Deploy to your preferred hosting platform
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

## Performance Optimization

- Images are processed in-memory (no disk storage)
- Optimized bundle splitting for faster loading
- Responsive images for different screen sizes
- Health checks for service monitoring

## Security Considerations

- No permanent image storage
- API key stored as environment variable
- CORS enabled for cross-origin requests
- Input validation for uploaded images

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