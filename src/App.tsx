import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, Sparkles, ArrowLeft, Palette, RotateCcw, FlipHorizontal, Image, Type, Users, Zap, QrCode } from 'lucide-react';

type AppState = 'welcome' | 'camera' | 'preview' | 'processing' | 'result';
type FeatureType = 'stylized' | 'faceswap' | 'custom';

interface ProcessingResult {
  originalImage: string;
  generatedImage: string;
  qrCode: string;
  feature: FeatureType;
  prompt?: string;
}

interface FeatureOption {
  id: FeatureType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
}

const features: FeatureOption[] = [
  {
    id: 'stylized',
    name: 'AI Style',
    icon: Palette,
    description: 'Ghibli, Pixar & more',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'faceswap',
    name: 'Face Swap',
    icon: Users,
    description: 'Swap faces with AI',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Type,
    description: 'Your own prompt',
    color: 'from-emerald-500 to-teal-600'
  }
];

function App() {
  const [state, setState] = useState<AppState>('welcome');
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>('stylized');
  const [customPrompt, setCustomPrompt] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsCameraReady(false);
      setIsStartingCamera(true);
      
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      setState('camera');
      
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          
          const handleLoadedMetadata = () => {
            videoRef.current?.play()
              .then(() => {
                setIsCameraReady(true);
                setIsStartingCamera(false);
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError('Failed to start camera preview. Please try again.');
                setIsStartingCamera(false);
              });
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
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
        } else {
          setError('Unable to access camera. Please check your camera settings.');
        }
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
    setIsStartingCamera(false);
  }, []);

  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isCameraReady) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [isCameraReady, stopCamera, startCamera]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Camera not ready. Please wait for the camera to load.');
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
        setState('preview');
      }
    }
  }, [stopCamera, isCameraReady]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCapturedImage(imageData);
        stopCamera();
        setState('preview');
      };
      reader.readAsDataURL(file);
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const generateAIImage = useCallback(async () => {
    if (!capturedImage) return;
    
    setIsProcessing(true);
    setState('processing');
    setError(null);

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');
      formData.append('feature', selectedFeature);
      
      if (selectedFeature === 'custom' && customPrompt.trim()) {
        formData.append('prompt', customPrompt.trim());
      }
      
      const apiUrl = '/api/generate';
      const result = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!result.ok) {
        const errorData = await result.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${result.status}`);
      }
      
      const data = await result.json();
      
      if (!data.success || !data.generatedImage) {
        throw new Error('Invalid response from server');
      }
      
      const processedResult: ProcessingResult = {
        originalImage: capturedImage,
        generatedImage: data.generatedImage,
        qrCode: data.qrCode,
        feature: selectedFeature,
        prompt: selectedFeature === 'custom' ? customPrompt : undefined
      };
      
      setResult(processedResult);
      setLastGeneratedImage(data.generatedImage);
      setState('result');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? `Failed to process image: ${err.message}` : 'Failed to process image. Please try again.');
      setState('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, selectedFeature, customPrompt]);

  const downloadImage = useCallback(() => {
    if (result?.generatedImage) {
      const link = document.createElement('a');
      link.download = `ai-generated-${selectedFeature}-${Date.now()}.jpg`;
      link.href = result.generatedImage;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [result, selectedFeature]);

  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setCustomPrompt('');
    setShowCustomPromptInput(false);
    setIsCameraReady(false);
    setIsStartingCamera(false);
    setState('welcome');
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">AI Image Generator</h1>
                <p className="text-xs text-gray-400">Multi-Feature AI Studio</p>
              </div>
            </div>
            {state !== 'welcome' && (
              <button
                onClick={reset}
                className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Welcome Screen */}
      {state === 'welcome' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">AI Image Generator</h2>
            <p className="text-lg text-gray-300 max-w-md">
              Transform your photos with AI. Choose from stylized themes, face swap, or custom prompts.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-full flex items-center justify-center`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{feature.name}</h3>
                      <p className="text-sm text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={startCamera}
            disabled={isStartingCamera}
            className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 transform shadow-lg ${
              isStartingCamera
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 hover:scale-105 hover:shadow-xl'
            }`}
          >
            {isStartingCamera ? 'Starting Camera...' : 'Start Creating'}
          </button>
        </div>
      )}

      {/* Camera Screen */}
      {state === 'camera' && (
        <div className="relative h-[calc(100vh-80px)] bg-black">
          {/* Video Preview */}
          <div className="relative w-full h-full" onClick={isCameraReady ? captureImage : undefined}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Loading overlay */}
            {!isCameraReady && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-white text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-base">Initializing camera...</p>
                </div>
              </div>
            )}
            
            {/* Tap to capture hint */}
            {isCameraReady && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-white text-sm">Tap anywhere to capture</p>
              </div>
            )}
          </div>

          {/* Feature Selection Bar */}
          <div className="absolute top-20 left-0 right-0 px-4">
            <div className="flex justify-center space-x-2">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                const isSelected = selectedFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => {
                      setSelectedFeature(feature.id);
                      if (feature.id === 'custom') {
                        setShowCustomPromptInput(true);
                      } else {
                        setShowCustomPromptInput(false);
                      }
                    }}
                    className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${feature.color} text-white shadow-lg`
                        : 'bg-black/50 backdrop-blur-sm text-gray-300 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs font-medium">{feature.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt Input */}
          {showCustomPromptInput && selectedFeature === 'custom' && (
            <div className="absolute top-40 left-4 right-4">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter your custom prompt..."
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-8">
            <div className="flex items-center justify-between">
              {/* Last Generated Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 border border-gray-600">
                {lastGeneratedImage ? (
                  <img src={lastGeneratedImage} alt="Last generated" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Shutter Button */}
              <button
                onClick={captureImage}
                disabled={!isCameraReady}
                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${
                  isCameraReady
                    ? 'bg-white hover:bg-gray-100 active:scale-95'
                    : 'bg-gray-600 border-gray-600 cursor-not-allowed'
                }`}
              >
                <div className={`w-16 h-16 rounded-full ${isCameraReady ? 'bg-white' : 'bg-gray-500'}`}></div>
              </button>

              {/* Camera Controls */}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={flipCamera}
                  className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Preview Screen */}
      {state === 'preview' && capturedImage && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate?</h2>
            <p className="text-gray-300">
              {selectedFeature === 'stylized' && 'Transform with AI styling'}
              {selectedFeature === 'faceswap' && 'Swap faces with AI'}
              {selectedFeature === 'custom' && 'Generate with your prompt'}
            </p>
          </div>
          
          <div className="w-full max-w-sm">
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          </div>

          {selectedFeature === 'custom' && (
            <div className="w-full max-w-sm">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom prompt..."
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={generateAIImage}
              disabled={isProcessing || (selectedFeature === 'custom' && !customPrompt.trim())}
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 transform shadow-lg flex items-center space-x-2 ${
                isProcessing || (selectedFeature === 'custom' && !customPrompt.trim())
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate AI Image</span>
            </button>
            
            <button
              onClick={retakePhoto}
              className="bg-gray-800 text-white px-6 py-4 rounded-full font-semibold hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing Screen */}
      {state === 'processing' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center space-y-8">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Creating AI Magic</h2>
            <p className="text-lg text-gray-300 max-w-md">
              {selectedFeature === 'stylized' && 'Applying beautiful AI styling to your image...'}
              {selectedFeature === 'faceswap' && 'Processing face swap with advanced AI...'}
              {selectedFeature === 'custom' && 'Generating image from your custom prompt...'}
            </p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 max-w-md">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <RefreshCw className="w-6 h-6 text-purple-500 animate-spin" />
              <span className="text-white font-medium">Processing...</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>

          {capturedImage && (
            <div className="w-full max-w-xs">
              <img
                src={capturedImage}
                alt="Processing"
                className="w-full h-auto rounded-xl shadow-xl opacity-50"
              />
            </div>
          )}
        </div>
      )}

      {/* Result Screen */}
      {state === 'result' && result && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">AI Magic Complete!</h2>
            <p className="text-gray-300">Your transformed image is ready</p>
          </div>
          
          <div className="w-full max-w-lg space-y-4">
            <img
              src={result.generatedImage}
              alt="AI Generated"
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            
            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mx-auto w-fit">
              <img
                src={result.qrCode}
                alt="Download QR Code"
                className="w-32 h-32"
              />
              <p className="text-black text-xs text-center mt-2">Scan to download</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={downloadImage}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-8 py-4 rounded-full font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Image</span>
            </button>
            
            <button
              onClick={reset}
              className="bg-gray-800 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Create Another</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm pr-2">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-white hover:text-gray-200 ml-4 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;