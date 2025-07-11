import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, Sparkles, ArrowLeft, Palette, RotateCcw, Users, Type, RotateCw, X } from 'lucide-react';
import QRCode from 'qrcode';

type AppState = 'welcome' | 'camera' | 'preview' | 'processing' | 'result';
type FeatureType = 'ai-style' | 'face-swap' | 'custom';

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
}

interface FaceSwapUploads {
  sourceFace?: File;
  targetFace?: File;
  template?: File;
}

const features: FeatureOption[] = [
  {
    id: 'ai-style',
    name: 'AI Style',
    icon: Palette,
    description: 'Template-based styling'
  },
  {
    id: 'face-swap',
    name: 'Face Swap',
    icon: Users,
    description: 'Advanced face swapping'
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: Type,
    description: 'Your own prompt'
  }
];

function App() {
  const [state, setState] = useState<AppState>('welcome');
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>('ai-style');
  const [customPrompt, setCustomPrompt] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [showFaceSwapModal, setShowFaceSwapModal] = useState(false);
  const [faceSwapUploads, setFaceSwapUploads] = useState<FaceSwapUploads>({});
  
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
        // Save the original image without mirroring
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

  const handleFaceSwapFileUpload = useCallback((type: keyof FaceSwapUploads, file: File | null) => {
    setFaceSwapUploads(prev => ({
      ...prev,
      [type]: file || undefined
    }));
  }, []);

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
      
      // Add face swap uploads if available
      if (selectedFeature === 'face-swap') {
        if (faceSwapUploads.sourceFace) {
          formData.append('sourceFace', faceSwapUploads.sourceFace);
        }
        if (faceSwapUploads.targetFace) {
          formData.append('targetFace', faceSwapUploads.targetFace);
        }
        if (faceSwapUploads.template) {
          formData.append('template', faceSwapUploads.template);
        }
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
      setState('result');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? `Failed to process image: ${err.message}` : 'Failed to process image. Please try again.');
      setState('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, selectedFeature, customPrompt, faceSwapUploads]);

  const downloadImage = useCallback(() => {
    if (result?.generatedImage) {
      const link = document.createElement('a');
      link.download = `assetwise-ai-${selectedFeature}-${Date.now()}.jpg`;
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
    setShowFaceSwapModal(false);
    setFaceSwapUploads({});
    setIsCameraReady(false);
    setIsStartingCamera(false);
    setState('welcome');
  }, [stopCamera]);

  const generateDownloadableQR = useCallback(async (imageData: string) => {
    // Create a special URL that the QR scanner can use
    const downloadData = {
      type: 'image_download',
      data: imageData,
      filename: `ASW-AI-${Date.now()}.jpg`
    };
    
    // Create QR code with JSON data
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(downloadData));
    return qrCodeDataUrl;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/assetwise-logo.png" 
                alt="AssetWise" 
                className="h-8 w-auto"
                onError={(e) => {
                  // Fallback if logo doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">AssetWise AI</h1>
                <p className="text-xs text-gray-500">Image Generator</p>
              </div>
            </div>
            {state !== 'welcome' && (
              <button
                onClick={reset}
                className="flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-assetwise-600 transition-colors"
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
          <div className="space-y-6">
            <img 
              src="/assetwise-logo.png" 
              alt="AssetWise" 
              className="h-16 w-auto mx-auto"
              onError={(e) => {
                // Fallback if logo doesn't load
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Image Generator</h2>
              <p className="text-lg text-gray-600 max-w-md">
                Transform your photos with advanced AI technology. Choose from multiple generation modes.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-assetwise-600 rounded-full flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
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
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-assetwise-600 text-white hover:bg-assetwise-700 hover:scale-105 hover:shadow-xl'
            }`}
          >
            {isStartingCamera ? 'Starting Camera...' : 'Start Creating'}
          </button>
        </div>
      )}

      {/* Camera Screen */}
      {state === 'camera' && (
        <div className="relative h-[calc(100vh-80px)] bg-black">
          {/* Video Preview with mirroring for user display */}
          <div className="relative w-full h-full" onClick={isCameraReady ? captureImage : undefined}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
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

          {/* Feature Selection Bar - Top Center */}
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
                        setShowFaceSwapModal(false);
                      } else if (feature.id === 'face-swap') {
                        setShowFaceSwapModal(true);
                        setShowCustomPromptInput(false);
                      } else {
                        setShowCustomPromptInput(false);
                        setShowFaceSwapModal(false);
                      }
                    }}
                    className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-assetwise-600 text-white shadow-lg'
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
                  className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-assetwise-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Face Swap Modal */}
          {showFaceSwapModal && selectedFeature === 'face-swap' && (
            <div className="absolute top-40 left-4 right-4">
              <div className="bg-black/90 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Face Swap Options</h3>
                  <button
                    onClick={() => setShowFaceSwapModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm mb-2">Optional: Upload faces for custom swapping</p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-white text-sm mb-1">Source Face</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFaceSwapFileUpload('sourceFace', e.target.files?.[0] || null)}
                        className="w-full text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm mb-1">Target Face</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFaceSwapFileUpload('targetFace', e.target.files?.[0] || null)}
                        className="w-full text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm mb-1">Template (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFaceSwapFileUpload('template', e.target.files?.[0] || null)}
                        className="w-full text-white bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-xs">Leave empty to use automatic face detection from captured photo</p>
                </div>
              </div>
            </div>
          )}

          {/* Camera Flip Button - Top Right */}
          <div className="absolute top-20 right-4">
            <button
              onClick={flipCamera}
              className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-8">
            <div className="flex items-center justify-between">
              {/* Upload Button - Left */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Shutter Button - Center */}
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

              {/* Empty space for symmetry - Right */}
              <div className="w-12 h-12"></div>
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 space-y-6 bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate?</h2>
            <p className="text-gray-600">
              {selectedFeature === 'ai-style' && 'Apply AI styling to your image'}
              {selectedFeature === 'face-swap' && 'Perform advanced face swapping'}
              {selectedFeature === 'custom' && 'Generate with your custom prompt'}
            </p>
          </div>
          
          <div className="w-full max-w-sm">
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-auto rounded-2xl shadow-lg border border-gray-200"
            />
          </div>

          {selectedFeature === 'custom' && (
            <div className="w-full max-w-sm">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter your custom prompt..."
                className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 focus:border-assetwise-500 focus:outline-none"
              />
            </div>
          )}

          {selectedFeature === 'face-swap' && (
            <div className="w-full max-w-sm bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Face Swap Settings</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Source Face: {faceSwapUploads.sourceFace ? '✓ Uploaded' : 'Auto-detect from photo'}</p>
                <p>• Target Face: {faceSwapUploads.targetFace ? '✓ Uploaded' : 'Auto-detect from photo'}</p>
                <p>• Template: {faceSwapUploads.template ? '✓ Uploaded' : 'Use original background'}</p>
              </div>
            </div>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={generateAIImage}
              disabled={isProcessing || (selectedFeature === 'custom' && !customPrompt.trim())}
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 transform shadow-lg flex items-center space-x-2 ${
                isProcessing || (selectedFeature === 'custom' && !customPrompt.trim())
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-assetwise-600 text-white hover:bg-assetwise-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate AI Image</span>
            </button>
            
            <button
              onClick={retakePhoto}
              className="bg-gray-200 text-gray-700 px-6 py-4 rounded-full font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      )}

      {/* Processing Screen */}
      {state === 'processing' && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 text-center space-y-8 bg-gray-50">
          <div className="space-y-4">
            <div className="w-24 h-24 bg-assetwise-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Processing with AI</h2>
            <p className="text-lg text-gray-600 max-w-md">
              {selectedFeature === 'ai-style' && 'Applying beautiful AI styling to your image...'}
              {selectedFeature === 'face-swap' && 'Processing advanced face swap...'}
              {selectedFeature === 'custom' && 'Generating image from your custom prompt...'}
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-lg border border-gray-200">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <RefreshCw className="w-6 h-6 text-assetwise-600 animate-spin" />
              <span className="text-gray-900 font-medium">Processing...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-assetwise-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>

          {capturedImage && (
            <div className="w-full max-w-xs">
              <img
                src={capturedImage}
                alt="Processing"
                className="w-full h-auto rounded-xl shadow-lg opacity-50 border border-gray-200"
              />
            </div>
          )}
        </div>
      )}

      {/* Result Screen */}
      {state === 'result' && result && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 space-y-6 bg-gray-50">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Generation Complete!</h2>
            <p className="text-gray-600">Your transformed image is ready</p>
          </div>
          
          <div className="w-full max-w-lg space-y-4">
            <div className="relative">
              <img
                src={result.generatedImage}
                alt="AI Generated"
                className="w-full h-auto rounded-2xl shadow-lg border border-gray-200"
              />
              {/* AssetWise logo overlay would be added here by the backend */}
            </div>
            
            {/* QR Code - Only appears after generation */}
            {result.qrCode && (
              <div className="bg-white p-4 rounded-xl mx-auto w-fit shadow-lg border border-gray-200">
                <img
                  src={result.qrCode}
                  alt="Download QR Code"
                  className="w-32 h-32"
                />
                <p className="text-gray-700 text-xs text-center mt-2 font-medium">Scan to download</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={downloadImage}
              className="bg-assetwise-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-assetwise-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Image</span>
            </button>
            
            <button
              onClick={reset}
              className="bg-gray-200 text-gray-700 px-8 py-4 rounded-full font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
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