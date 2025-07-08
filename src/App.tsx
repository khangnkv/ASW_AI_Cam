import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, Sparkles, ArrowLeft, Palette, RotateCcw } from 'lucide-react';

type AppState = 'welcome' | 'camera' | 'preview' | 'processing' | 'result';

interface ProcessingResult {
  originalImage: string;
  ghibliImage: string;
}

function App() {
  const [state, setState] = useState<AppState>('welcome');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsCameraReady(false);
      setIsStartingCamera(true);
      
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      });
      
      console.log('Camera stream obtained:', stream);
      console.log('Stream tracks:', stream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      })));
      
      // Store stream reference first
      streamRef.current = stream;
      
      // Set state to camera BEFORE setting up video
      setState('camera');
      
      // Wait for next tick to ensure DOM is updated
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          console.log('Setting video srcObject...');
          videoRef.current.srcObject = streamRef.current;
          
          // Set up event handlers
          const video = videoRef.current;
          
          const handleLoadedMetadata = () => {
            console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
            
            video.play()
              .then(() => {
                console.log('Video playing successfully');
                setIsCameraReady(true);
                setIsStartingCamera(false);
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError('Failed to start camera preview. Please try again.');
                setIsStartingCamera(false);
              });
          };
          
          const handleError = (err: Event) => {
            console.error('Video error:', err);
            setError('Camera preview error. Please try again.');
            setIsStartingCamera(false);
          };
          
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
          
          // Cleanup function
          return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
          };
        }
      }, 100);
      
    } catch (err) {
      console.error('Camera access error:', err);
      setIsStartingCamera(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please ensure your device has a camera.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another application.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera constraints not supported. Trying with basic settings...');
          // Try again with basic constraints
          setTimeout(() => {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                streamRef.current = stream;
                setState('camera');
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().then(() => {
                    setIsCameraReady(true);
                    setIsStartingCamera(false);
                  });
                }
              })
              .catch(() => {
                setError('Unable to access camera with any settings.');
              });
          }, 1000);
        } else {
          setError('Unable to access camera. Please check your camera settings.');
        }
      } else {
        setError('Unable to access camera. Please ensure you have granted camera permissions.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsStartingCamera(false);
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Ensure video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Camera not ready. Please wait for the camera to load.');
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Capturing image:', canvas.width, 'x', canvas.height);
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        console.log('Image captured, data length:', imageData.length);
        
        setCapturedImage(imageData);
        stopCamera();
        setState('preview'); // Go to preview state instead of processing
      }
    } else {
      setError('Camera not ready. Please wait for the camera to load.');
    }
  }, [stopCamera, isCameraReady]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera(); // This will set state to 'camera'
  }, [startCamera]);

  const generateGhibliImage = useCallback(async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    setState('processing');
    setError(null);

    try {
      console.log('Processing image...');
      
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create FormData
      const formData = new FormData();
      formData.append('image', blob, 'portrait.jpg');
      
      // Send to backend
      const result = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });
      
      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${result.status}`);
      }
      
      const data = await result.json();
      
      if (!data.success || !data.ghibliImage) {
        throw new Error('Invalid response from server');
      }
      
      setResult({
        originalImage: capturedImage,
        ghibliImage: data.ghibliImage
      });
      setState('result');
      console.log('Image processing completed');
    } catch (err) {
      console.error('Processing error:', err);
      if (err instanceof Error) {
        setError(`Failed to process image: ${err.message}`);
      } else {
        setError('Failed to process image. Please try again.');
      }
      setState('preview'); // Return to preview on error
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage]);

  const downloadImage = useCallback(() => {
    if (result?.ghibliImage) {
      const link = document.createElement('a');
      link.download = `ghibli-portrait-${Date.now()}.jpg`;
      link.href = result.ghibliImage;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [result]);

  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setIsCameraReady(false);
    setIsStartingCamera(false);
    setState('welcome');
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800">Ghibli Portrait</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">AI-Powered Art Generator</p>
              </div>
            </div>
            {state !== 'welcome' && (
              <button
                onClick={reset}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        {/* Welcome Screen */}
        {state === 'welcome' && (
          <div className="text-center space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 px-2">Transform Your Portrait</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                Capture your photo and watch as AI transforms it into a beautiful Ghibli-style artwork. 
                Experience the magic of Studio Ghibli's distinctive art style applied to your portrait.
              </p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Camera className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">Take a clear portrait photo</span>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">AI processes your image</span>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-cyan-600" />
                  </div>
                  <span className="text-sm sm:text-base text-gray-700">Download your Ghibli portrait</span>
                </div>
              </div>
            </div>

            <button
              onClick={startCamera}
              disabled={isStartingCamera}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-200 transform shadow-lg ${
                isStartingCamera
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              {isStartingCamera ? 'Starting Camera...' : 'Start Camera'}
            </button>
          </div>
        )}

        {/* Camera Screen */}
        {state === 'camera' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 px-2">Position Yourself</h2>
              <p className="text-sm sm:text-base text-gray-600 px-4">Center your face in the frame for the best results</p>
              {!isCameraReady && (
                <p className="text-xs sm:text-sm text-emerald-600 mt-2 flex items-center justify-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Loading camera preview...</span>
                </p>
              )}
            </div>
            
            <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto rounded-xl sm:rounded-2xl shadow-2xl bg-black"
                style={{ 
                  minHeight: '250px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              
              {/* Loading overlay */}
              {!isCameraReady && (
                <div className="absolute inset-0 bg-black/70 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <div className="text-white text-center">
                    <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm sm:text-base">Initializing camera...</p>
                    <p className="text-xs sm:text-sm text-gray-300 mt-1 px-2">Please allow camera access</p>
                  </div>
                </div>
              )}
              
              {/* Camera frame overlay */}
              {isCameraReady && (
                <>
                  <div className="absolute inset-0 border-2 sm:border-4 border-emerald-400 rounded-xl sm:rounded-2xl pointer-events-none opacity-50"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-40 sm:w-48 sm:h-64 border-2 border-white rounded-full pointer-events-none opacity-60"></div>
                </>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <button
                onClick={captureImage}
                disabled={!isCameraReady}
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-200 transform shadow-lg flex items-center justify-center space-x-2 ${
                  isCameraReady
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-105 hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{isCameraReady ? 'Capture Photo' : 'Loading...'}</span>
              </button>
              
              <button
                onClick={reset}
                className="w-full sm:w-auto bg-white text-gray-700 px-6 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Cancel
              </button>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Photo Preview Screen */}
        {state === 'preview' && capturedImage && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 px-2">How does this look?</h2>
              <p className="text-sm sm:text-base text-gray-600 px-4">Review your photo before generating the Ghibli-style artwork</p>
            </div>
            
            <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 sm:px-0">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured portrait preview"
                  className="w-full h-auto rounded-xl sm:rounded-2xl shadow-2xl"
                />
                <div className="absolute inset-0 border-2 sm:border-4 border-emerald-400 rounded-xl sm:rounded-2xl pointer-events-none opacity-30"></div>
              </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-md mx-auto">
              <div className="text-center space-y-2 sm:space-y-3">
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 mx-auto" />
                <p className="text-sm sm:text-base text-gray-700 font-medium">Ready to create magic?</p>
                <p className="text-xs sm:text-sm text-gray-600 px-2">
                  Your photo will be transformed into beautiful Studio Ghibli-style artwork
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <button
                onClick={generateGhibliImage}
                disabled={isProcessing}
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-200 transform shadow-lg flex items-center justify-center space-x-2 ${
                  isProcessing
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 hover:scale-105 hover:shadow-xl'
                }`}
              >
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">{isProcessing ? 'Generating...' : '🎨 Generate Ghibli Image'}</span>
              </button>
              
              <button
                onClick={retakePhoto}
                disabled={isProcessing}
                className={`w-full sm:w-auto bg-white text-gray-700 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-200 transform shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${
                  isProcessing 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-50 hover:scale-105'
                }`}
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">🔁 Retake Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing Screen */}
        {state === 'processing' && (
          <div className="text-center space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 px-2">Creating Your Ghibli Portrait</h2>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
                Our AI is working its magic to transform your photo into a beautiful Ghibli-style artwork. 
                This usually takes about 30-60 seconds.
              </p>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 animate-spin" />
                  <span className="text-sm sm:text-base text-gray-700 font-medium">Processing your image...</span>
                </div>
                
                {/* Progress indicator */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-600">
                  ✨ Applying Ghibli magic to your portrait...
                </p>
              </div>
            </div>

            {/* Show captured image preview during processing */}
            {capturedImage && (
              <div className="w-full max-w-xs sm:max-w-sm mx-auto px-4 sm:px-0">
                <img
                  src={capturedImage}
                  alt="Processing portrait"
                  className="w-full h-auto rounded-xl sm:rounded-2xl shadow-xl opacity-75"
                />
              </div>
            )}
          </div>
        )}

        {/* Result Screen */}
        {state === 'result' && result && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 px-2">Your Ghibli Portrait</h2>
              <p className="text-base sm:text-lg text-gray-600">Beautiful transformation complete!</p>
            </div>
            
            {/* Single centered Ghibli image */}
            <div className="w-full max-w-sm sm:max-w-lg lg:max-w-2xl mx-auto px-4 sm:px-0">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 text-center px-2">Your Magical Transformation</h3>
                <img
                  src={result.ghibliImage}
                  alt="Ghibli-style portrait"
                  className="w-full h-auto rounded-xl sm:rounded-2xl shadow-2xl"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <button
                onClick={downloadImage}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Download Portrait</span>
              </button>
              
              <button
                onClick={reset}
                className="w-full sm:w-auto bg-white text-gray-700 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Create Another</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 bg-red-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm pr-2">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-white hover:text-gray-200 ml-2 sm:ml-4 text-lg sm:text-xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;