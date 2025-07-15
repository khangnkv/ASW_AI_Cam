// App.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, Sparkles, ArrowLeft, Palette, RotateCcw, Users, Type, RotateCw, X } from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE_URL } from './config/api';

type AppState = 'welcome' | 'camera' | 'preview' | 'processing' | 'result';
type FeatureType = 'ai-style' | 'custom' | 'face-swap';

interface ProcessingResult {
  generatedImage: string;
  publicImageUrl: string;
  qrCode?: string;
  feature: string;
  timestamp?: string;
  message: string;
}

interface FeatureOption {
  id: FeatureType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

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
  const [logoError, setLogoError] = useState(false);
  const [showFaceSwapModal, setShowFaceSwapModal] = useState(false);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [faceSwapOptions, setFaceSwapOptions] = useState({
    gender_0: 'male',
    workflow_type: 'user_hair',
    upscale: true
  });
  
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
    setCustomPrompt('');
    startCamera();
  }, [startCamera]);

  // Main generation logic - no longer needs useCallback
  const generateImage = async (imageFile: File) => {
    setState('processing');
    setError(null);
  
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('feature', selectedFeature || 'ai-style');
      
      if (selectedFeature === 'custom' && customPrompt.trim()) {
        formData.append('prompt', customPrompt.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        body: formData
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Generation failed');
      }
  
      const data = await response.json();
      if (data.success) {
        setResult(data);
        setState('result');
      } else {
        throw new Error(data.error || 'Generation failed on server');
      }
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(`Generation failed: ${err.message}`);
      setState('preview');
    }
  };

  const generateFaceSwap = async (faceImageFile: File, targetImageFile: File) => {
    setState('processing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('face_image', faceImageFile);
      formData.append('target_image', targetImageFile);
      formData.append('gender_0', faceSwapOptions.gender_0);
      formData.append('workflow_type', faceSwapOptions.workflow_type);
      formData.append('upscale', String(faceSwapOptions.upscale));

      const response = await fetch(`${API_BASE_URL}/api/face-swap`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Face swap failed');
      }

      const data = await response.json();
      if (data.success) {
        setResult(data);
        setState('result');
      } else {
        throw new Error(data.error || 'Face swap failed on server');
      }
    } catch (err: any) {
      console.error('Error in face swap:', err);
      setError(`Face swap failed: ${err.message}`);
      setState('preview');
    }
  };

  const downloadImage = useCallback(async () => {
    if (!result?.generatedImage) return;

    try {
      const link = document.createElement('a');
      link.href = result.generatedImage;
      link.download = `assetwise-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Could not download image.');
    }
  }, [result]);

  const reset = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setCustomPrompt('');
    setShowCustomPromptInput(false);
    setShowFaceSwapModal(false);
    setTargetImage(null);
    setFaceSwapOptions({
      gender_0: 'male',
      workflow_type: 'user_hair',
      upscale: true
    });
    setIsCameraReady(false);
    setIsStartingCamera(false);
    setState('welcome');
  }, [stopCamera]);

  const generateDownloadableQR = useCallback(async (imageData: string) => {
    const downloadData = {
      type: 'image_download',
      data: imageData,
      filename: `ASW-AI-${Date.now()}.jpg`
    };
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
              {!logoError ? (
                <img 
                  src="/assetwise_logo.png" 
                  alt="AssetWise AI" 
                  className="h-10 w-auto"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                    <span className="text-white font-bold text-sm">AW</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">AssetWise AI</span>
                </div>
              )}
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
          <div className="relative w-full h-full" onClick={isCameraReady ? captureImage : undefined}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            
            {!isCameraReady && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-white text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-base">Initializing camera...</p>
                </div>
              </div>
            )}
            
            {isCameraReady && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-white text-sm">Tap anywhere to capture</p>
              </div>
            )}
          </div>

          <div className="absolute top-20 left-0 right-0 px-4">
            <div className="flex justify-center space-x-2">
              {features.map((feature) => {
                const IconComponent = feature.icon;
                const isSelected = selectedFeature === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setSelectedFeature(feature.id)}
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

          <div className="absolute top-20 right-4">
            <button
              onClick={flipCamera}
              className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-8 left-0 right-0 px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <Upload className="w-5 h-5" />
              </button>

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
              {selectedFeature === 'custom' && 'Generate with your custom prompt'}
              {selectedFeature === 'face-swap' && 'Upload target image for face swap'}
            </p>
          </div>
          
          <div className="w-full max-w-sm">
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-auto rounded-2xl shadow-lg border border-gray-200"
            />
          </div>

          {/* Custom Prompt Input */}
          {selectedFeature === 'custom' && (
            <div className="w-full max-w-sm space-y-2">
              <label className="block text-gray-700 text-sm font-medium">
                Custom Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe how you want your image to be transformed..."
                className="w-full bg-white text-gray-900 px-4 py-3 rounded-lg border border-gray-300 focus:border-assetwise-500 focus:outline-none resize-none"
                rows={3}
                required
              />
              <p className="text-gray-500 text-xs">
                Be specific about the style, mood, or transformation you want
              </p>
            </div>
          )}

          {/* Face Swap Settings */}
          {selectedFeature === 'face-swap' && (
            <div className="w-full max-w-sm space-y-4">
              {/* Target Image Upload */}
              <div className="space-y-2">
                <label className="block text-gray-700 text-sm font-medium">
                  Target Image <span className="text-red-500">*</span>
                </label>
                <div 
                  onClick={() => document.getElementById('target-image-input')?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-assetwise-500 transition-colors"
                >
                  {targetImage ? (
                    <div className="text-center">
                      <img 
                        src={URL.createObjectURL(targetImage)} 
                        alt="Target" 
                        className="h-20 w-20 object-cover rounded-lg mx-auto mb-2"
                      />
                      <p className="text-sm text-gray-600">{targetImage.name}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload target image</p>
                    </div>
                  )}
                </div>
                <input
                  id="target-image-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setTargetImage(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>

              {/* Face Swap Options */}
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Gender</label>
                  <select
                    value={faceSwapOptions.gender_0}
                    onChange={(e) => setFaceSwapOptions(prev => ({...prev, gender_0: e.target.value}))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:border-assetwise-500 focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">Workflow</label>
                  <select
                    value={faceSwapOptions.workflow_type}
                    onChange={(e) => setFaceSwapOptions(prev => ({...prev, workflow_type: e.target.value}))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-300 focus:border-assetwise-500 focus:outline-none"
                  >
                    <option value="user_hair">User Hair</option>
                    <option value="target_hair">Target Hair</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="upscale"
                    checked={faceSwapOptions.upscale}
                    onChange={(e) => setFaceSwapOptions(prev => ({...prev, upscale: e.target.checked}))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="upscale" className="text-gray-700 text-sm">
                    Enable upscaling
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={async () => {
                if (!capturedImage) return;

                // Validation for different features
                if (selectedFeature === 'custom' && !customPrompt.trim()) {
                  setError('Please enter a custom prompt before generating.');
                  return;
                }
                
                if (selectedFeature === 'face-swap' && !targetImage) {
                  setError('Please upload a target image for face swap.');
                  return;
                }
                
                const response = await fetch(capturedImage);
                const blob = await response.blob();
                const file = new File([blob], 'captured.jpg', { type: blob.type });
                
                if (selectedFeature === 'face-swap') {
                  await generateFaceSwap(file, targetImage!);
                } else {
                  await generateImage(file);
                }
              }}
              disabled={
                isProcessing || 
                (selectedFeature === 'custom' && !customPrompt.trim()) ||
                (selectedFeature === 'face-swap' && !targetImage)
              }
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 transform shadow-lg flex items-center space-x-2 ${
                isProcessing || 
                (selectedFeature === 'custom' && !customPrompt.trim()) ||
                (selectedFeature === 'face-swap' && !targetImage)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-assetwise-600 text-white hover:bg-assetwise-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>
                {selectedFeature === 'custom' && !customPrompt.trim() 
                  ? 'Enter Prompt First'
                  : selectedFeature === 'face-swap' && !targetImage
                  ? 'Upload Target Image'
                  : 'Generate AI Image'
                }
              </span>
            </button>
            
            <button
              onClick={retakePhoto}
              className="bg-gray-200 text-gray-700 px-6 py-4 rounded-full font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Retake</span>
            </button>
          </div>

          {error && (
            <div className="w-full max-w-sm">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}
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
              {selectedFeature === 'custom' && 'Generating image from your custom prompt...'}
              {selectedFeature === 'face-swap' && 'Swapping faces in the image...'}
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
            </div>
            
            {result.qrCode && (
              <div className="bg-white p-4 rounded-xl mx-auto w-fit shadow-lg border border-gray-200">
                <img
                  src={result.qrCode}
                  alt="Download QR Code"
                  className="w-32 h-32"
                />
                <p className="text-gray-700 text-center text-xs mt-2">
                  Scan to download
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={downloadImage}
              className="px-8 py-4 rounded-full font-semibold text-lg bg-assetwise-600 text-white hover:bg-assetwise-700 transition-all duration-200 transform shadow-lg flex items-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Image</span>
            </button>
            
            <button
              onClick={reset}
              className="bg-gray-200 text-gray-700 px-6 py-4 rounded-full font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>New Image</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;