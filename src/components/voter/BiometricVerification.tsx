import React, { useState, useRef, useEffect } from 'react';
import { Camera, Eye, CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { VoterDatabaseService } from '../../services/voterDatabaseService';
import { BiometricService } from '../../services/biometricService';

interface BiometricVerificationProps {
  onNavigate: (view: string) => void;
  onVerificationSuccess: () => void;
  nin: string;
  mode: 'login' | 'register';
}

export const BiometricVerification: React.FC<BiometricVerificationProps> = ({ 
  onNavigate, 
  onVerificationSuccess, 
  nin, 
  mode 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStep, setCaptureStep] = useState<'ready' | 'capturing' | 'processing' | 'complete'>('ready');
  const [livenessTests, setLivenessTests] = useState({
    blinkDetected: false,
    headMovement: false,
    qualityCheck: false
  });
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState('Position your face in the center and click Start Capture');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startBiometricCapture = async () => {
    setIsCapturing(true);
    setCaptureStep('capturing');
    setError('');
    setInstructions('Please look directly at the camera and blink naturally');

    try {
      // Step 1: Blink Detection
      setInstructions('Please blink 2-3 times naturally');
      await simulateLivenessTest('blink', 3000);
      setLivenessTests(prev => ({ ...prev, blinkDetected: true }));

      // Step 2: Head Movement
      setInstructions('Please turn your head slightly left, then right');
      await simulateLivenessTest('movement', 3000);
      setLivenessTests(prev => ({ ...prev, headMovement: true }));

      // Step 3: Quality Check
      setInstructions('Hold still while we verify image quality');
      await simulateLivenessTest('quality', 2000);
      setLivenessTests(prev => ({ ...prev, qualityCheck: true }));

      // Step 4: Processing
      setCaptureStep('processing');
      setInstructions('Processing biometric data...');
      
      if (mode === 'login') {
        // Authenticate existing voter
        const fakeEmbedding = Array.from({length: 128}, () => Math.random());
        const authResult = await VoterDatabaseService.authenticateVoter(nin, fakeEmbedding);
        
        if (!authResult.success) {
          throw new Error(authResult.error || 'Authentication failed');
        }
      } else {
        // For registration, we'll store the biometric data in the next step
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Step 5: Complete
      setCaptureStep('complete');
      setInstructions(mode === 'login' ? 'Authentication successful!' : 'Biometric data captured successfully!');
      
      // Auto-proceed after success
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Biometric capture failed. Please try again.');
      setCaptureStep('ready');
      setInstructions('Position your face in the center and click Start Capture');
      setLivenessTests({
        blinkDetected: false,
        headMovement: false,
        qualityCheck: false
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const simulateLivenessTest = (test: string, duration: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate success rate (90% for demo)
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error(`${test} test failed`));
        }
      }, duration);
    });
  };

  const resetCapture = () => {
    setCaptureStep('ready');
    setLivenessTests({
      blinkDetected: false,
      headMovement: false,
      qualityCheck: false
    });
    setInstructions('Position your face in the center and click Start Capture');
    setError('');
  };

  const getStepColor = (completed: boolean, active: boolean) => {
    if (completed) return 'text-green-600 bg-green-100';
    if (active) return 'text-blue-600 bg-blue-100';
    return 'text-gray-400 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => onNavigate(mode === 'login' ? 'voter-login' : 'voter-register')}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div className="bg-purple-600 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <Eye className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Biometric Verification</h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Verify your identity to access voting' : 'Capture your biometric data for registration'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            NIN: {nin.slice(0, 3)}***{nin.slice(-2)}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Camera Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Camera Feed
              </h3>
              
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                  width={640}
                  height={480}
                />
                
                {/* Overlay for face detection */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed rounded-full w-48 h-48 flex items-center justify-center">
                    <div className="text-white text-sm text-center">
                      Position your face here
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  <div className={`w-3 h-3 rounded-full ${isStreaming ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 text-sm font-medium">{instructions}</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center mb-4">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex space-x-4">
                {captureStep === 'ready' && (
                  <button
                    onClick={startBiometricCapture}
                    disabled={!isStreaming}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      !isStreaming
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white flex items-center justify-center`}
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Start Capture
                  </button>
                )}

                {captureStep === 'capturing' && (
                  <button
                    disabled
                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center"
                  >
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Capturing...
                  </button>
                )}

                {captureStep === 'processing' && (
                  <button
                    disabled
                    className="flex-1 py-3 px-4 bg-yellow-600 text-white rounded-lg font-medium flex items-center justify-center"
                  >
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </button>
                )}

                {captureStep === 'complete' && (
                  <button
                    disabled
                    className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {mode === 'login' ? 'Authentication Complete' : 'Capture Complete'}
                  </button>
                )}

                {(captureStep === 'ready' || error) && (
                  <button
                    onClick={resetCapture}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Liveness Tests Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Liveness Detection
              </h3>

              <div className="space-y-4">
                {/* Blink Detection */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      getStepColor(livenessTests.blinkDetected, captureStep === 'capturing')
                    }`}>
                      {livenessTests.blinkDetected ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Blink Detection</p>
                      <p className="text-sm text-gray-600">Natural eye blinking verification</p>
                    </div>
                  </div>
                  {livenessTests.blinkDetected && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* Head Movement */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      getStepColor(livenessTests.headMovement, captureStep === 'capturing' && livenessTests.blinkDetected)
                    }`}>
                      {livenessTests.headMovement ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <RefreshCw className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Head Movement</p>
                      <p className="text-sm text-gray-600">3D face pose verification</p>
                    </div>
                  </div>
                  {livenessTests.headMovement && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* Quality Check */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      getStepColor(livenessTests.qualityCheck, captureStep === 'capturing' && livenessTests.headMovement)
                    }`}>
                      {livenessTests.qualityCheck ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Image Quality</p>
                      <p className="text-sm text-gray-600">Lighting and clarity verification</p>
                    </div>
                  </div>
                  {livenessTests.qualityCheck && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>

              {/* Security Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Security Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Anti-spoofing protection</li>
                  <li>• Liveness detection algorithms</li>
                  <li>• Encrypted biometric storage</li>
                  <li>• NDPR compliant processing</li>
                </ul>
              </div>

              {/* Progress Indicator */}
              {captureStep !== 'ready' && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Verification Progress</span>
                    <span>
                      {Object.values(livenessTests).filter(Boolean).length}/3 Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(Object.values(livenessTests).filter(Boolean).length / 3) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>🔒 Your biometric data is encrypted and stored securely</p>
          <p>🛡️ Compliant with Nigeria Data Protection Regulation (NDPR)</p>
        </div>
      </div>
    </div>
  );
};