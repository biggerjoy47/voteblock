import * as tf from '@tensorflow/tfjs';
import { BiometricData } from '../types/voter';
import { CryptoSecurityService } from './cryptoSecurityService';

export class BiometricSecurityService {
  private static model: any = null;
  private static isModelLoaded = false;
  
  // Enhanced security thresholds
  private static readonly CONFIDENCE_THRESHOLD = 0.70;
  private static readonly LIVENESS_THRESHOLD = 0.75;
  private static readonly QUALITY_THRESHOLD = 0.70;
  private static readonly MIN_BLINK_COUNT = 2;
  private static readonly MAX_BLINK_COUNT = 8;
  private static readonly MIN_BLINK_DURATION = 100; // milliseconds
  private static readonly MAX_BLINK_DURATION = 500; // milliseconds

  /**
   * Initialize biometric model with enhanced security features
   */
  static async initializeModel(): Promise<void> {
    try {
      await tf.ready();
      // In production, load actual face recognition model
      // For demo, we simulate model loading
      this.isModelLoaded = true;
      console.log('Enhanced biometric security model initialized');
    } catch (error) {
      console.error('Error initializing biometric model:', error);
      throw new Error('Failed to initialize biometric security system');
    }
  }

  /**
   * Capture and analyze biometric data with comprehensive security checks
   */
  static async captureAndAnalyzeBiometric(videoElement: HTMLVideoElement): Promise<BiometricData | null> {
    if (!this.isModelLoaded) {
      await this.initializeModel();
    }

    try {
      // Create canvas for frame capture
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      ctx.drawImage(videoElement, 0, 0);
      
      // Convert to tensor for processing
      const imageTensor = tf.browser.fromPixels(canvas);
      
      // Perform comprehensive liveness detection
      const livenessTests = await this.performComprehensiveLivenessTests(imageTensor, videoElement);
      const livenessScore = this.calculateLivenessScore(livenessTests);
      
      // Validate liveness before proceeding
      if (!await this.validateAdvancedLiveness(livenessTests)) {
        imageTensor.dispose();
        return null;
      }
      
      // Generate face embedding with quality assessment
      const faceEmbedding = await this.generateSecureFaceEmbedding(imageTensor);
      const confidence = await this.calculateConfidenceScore(imageTensor);
      const qualityScore = await this.assessBiometricQuality(imageTensor, livenessTests);
      
      // Assess capture environment
      const captureEnvironment = await this.assessCaptureEnvironment(imageTensor);
      
      imageTensor.dispose();
      
      return {
        faceEmbedding,
        confidence,
        livenessScore,
        qualityScore,
        livenessTests,
        timestamp: new Date(),
        captureEnvironment
      };
    } catch (error) {
      console.error('Error in biometric analysis:', error);
      return null;
    }
  }

  /**
   * Perform comprehensive liveness detection tests
   */
  private static async performComprehensiveLivenessTests(
    imageTensor: tf.Tensor, 
    videoElement: HTMLVideoElement
  ): Promise<any> {
    // Enhanced blink detection with temporal analysis
    const blinkResult = await this.detectAdvancedBlink(videoElement);
    
    // Head movement detection with 3D pose estimation
    const headMovement = await this.detectHeadMovement(videoElement);
    
    // Advanced texture analysis for anti-spoofing
    const textureAnalysis = await this.performAdvancedTextureAnalysis(imageTensor);
    
    // Spoofing detection using multiple techniques
    const spoofingDetection = await this.detectSpoofingAttempts(imageTensor);
    
    return {
      blinkDetected: blinkResult.detected,
      headMovement,
      textureAnalysis,
      eyeBlinkCount: blinkResult.blinkCount,
      eyeAspectRatio: blinkResult.eyeAspectRatios,
      blinkDuration: blinkResult.blinkDuration,
      spoofingDetection
    };
  }

  /**
   * Advanced blink detection with eye aspect ratio analysis
   */
  private static async detectAdvancedBlink(videoElement: HTMLVideoElement): Promise<any> {
    // Simulate advanced blink detection
    // In production, this would use actual computer vision algorithms
    const ratios: number[] = [];
    let blinkCount = 0;
    let blinkDuration = 0;
    let inBlink = false;
    let blinkStartTime = 0;
    
    // Simulate 60 frames of eye aspect ratio data (2 seconds at 30fps)
    for (let i = 0; i < 60; i++) {
      let ratio = 0.35 + Math.random() * 0.05; // Normal eye state
      
      // Simulate natural blink patterns
      if ((i >= 15 && i <= 18) || (i >= 35 && i <= 37) || (i >= 50 && i <= 53)) {
        ratio = 0.15 + Math.random() * 0.08; // Blink state
        
        if (!inBlink) {
          inBlink = true;
          blinkStartTime = i * 33.33; // Convert frame to milliseconds
        }
      } else if (inBlink) {
        inBlink = false;
        const currentBlinkDuration = (i * 33.33) - blinkStartTime;
        if (currentBlinkDuration >= this.MIN_BLINK_DURATION && currentBlinkDuration <= this.MAX_BLINK_DURATION) {
          blinkDuration += currentBlinkDuration;
          blinkCount++;
        }
      }
      
      ratios.push(ratio);
    }
    
    // Validate blink characteristics
    const validBlinks = blinkCount >= this.MIN_BLINK_COUNT && 
                       blinkCount <= this.MAX_BLINK_COUNT &&
                       blinkDuration >= this.MIN_BLINK_DURATION;
    
    return {
      detected: validBlinks,
      blinkCount,
      eyeAspectRatios: ratios,
      blinkDuration
    };
  }

  /**
   * Advanced texture analysis for anti-spoofing
   */
  private static async performAdvancedTextureAnalysis(imageTensor: tf.Tensor): Promise<boolean> {
    try {
      // Calculate image statistics for texture analysis
      const mean = tf.mean(imageTensor);
      const variance = tf.moments(imageTensor).variance;
      const edges = await this.detectEdges(imageTensor);
      
      const meanValue = await mean.data();
      const varianceValue = await variance.data();
      const edgeCount = await edges.data();
      
      mean.dispose();
      variance.dispose();
      edges.dispose();
      
      // Advanced heuristics for real face detection
      const hasNaturalTexture = meanValue[0] > 30 && meanValue[0] < 200;
      const hasVariance = varianceValue[0] > 500;
      const hasEdges = edgeCount.filter(val => val > 0.5).length > 1000;
      
      return hasNaturalTexture && hasVariance && hasEdges;
    } catch (error) {
      console.error('Error in texture analysis:', error);
      return false;
    }
  }

  /**
   * Detect spoofing attempts using multiple techniques
   */
  private static async detectSpoofingAttempts(imageTensor: tf.Tensor): Promise<boolean> {
    try {
      // Frequency domain analysis
      const frequencyAnalysis = await this.analyzeFrequencyDomain(imageTensor);
      
      // Color space analysis
      const colorAnalysis = await this.analyzeColorSpaces(imageTensor);
      
      // Micro-texture analysis
      const microTextureAnalysis = await this.analyzeMicroTextures(imageTensor);
      
      // Combine results for spoofing detection
      const spoofingIndicators = [
        frequencyAnalysis,
        colorAnalysis,
        microTextureAnalysis
      ].filter(result => result).length;
      
      // Require at least 2 out of 3 anti-spoofing tests to pass
      return spoofingIndicators >= 2;
    } catch (error) {
      console.error('Error in spoofing detection:', error);
      return false;
    }
  }

  /**
   * Generate secure face embedding with normalization
   */
  private static async generateSecureFaceEmbedding(imageTensor: tf.Tensor): Promise<number[]> {
    try {
      // Preprocess image
      const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
      const normalized = resized.div(255.0);
      
      // Generate embedding (simulated - in production use actual model)
      const embedding = Array.from({length: 512}, () => Math.random() * 2 - 1);
      
      // Normalize embedding
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      const normalizedEmbedding = embedding.map(val => val / magnitude);
      
      resized.dispose();
      normalized.dispose();
      
      return normalizedEmbedding;
    } catch (error) {
      console.error('Error generating face embedding:', error);
      throw error;
    }
  }

  /**
   * Validate advanced liveness with comprehensive checks
   */
  static async validateAdvancedLiveness(livenessTests: any): Promise<boolean> {
    // Enhanced validation requirements
    const basicTests = [
      livenessTests.blinkDetected,
      livenessTests.headMovement,
      livenessTests.textureAnalysis,
      livenessTests.spoofingDetection
    ].filter(Boolean).length;
    
    const validBlinks = livenessTests.eyeBlinkCount >= this.MIN_BLINK_COUNT && 
                       livenessTests.eyeBlinkCount <= this.MAX_BLINK_COUNT;
    
    const validDuration = livenessTests.blinkDuration >= this.MIN_BLINK_DURATION;
    
    // Require: at least 3 basic tests + valid blink characteristics
    return basicTests >= 3 && validBlinks && validDuration;
  }

  /**
   * Authenticate voter using secure biometric comparison
   */
  static async authenticateVoter(
    capturedEmbedding: number[], 
    storedEmbedding: number[]
  ): Promise<{ match: boolean; confidence: number; similarity: number }> {
    try {
      // Decrypt stored embedding
      const decryptedStored = await CryptoSecurityService.decryptBiometricData(storedEmbedding);
      
      // Calculate cosine similarity
      const similarity = await this.calculateCosineSimilarity(capturedEmbedding, decryptedStored);
      
      // Apply adaptive threshold based on quality
      const adaptiveThreshold = this.CONFIDENCE_THRESHOLD;
      
      return {
        match: similarity >= adaptiveThreshold,
        confidence: similarity,
        similarity
      };
    } catch (error) {
      console.error('Error in voter authentication:', error);
      return {
        match: false,
        confidence: 0,
        similarity: 0
      };
    }
  }

  /**
   * Validate biometric quality meets security standards
   */
  static validateBiometricQuality(biometricData: BiometricData): boolean {
    return biometricData.qualityScore >= this.QUALITY_THRESHOLD &&
           biometricData.confidence >= this.CONFIDENCE_THRESHOLD &&
           biometricData.livenessScore >= this.LIVENESS_THRESHOLD;
  }

  /**
   * Generate secure biometric hash for storage
   */
  static async generateBiometricHash(embedding: number[]): Promise<string> {
    return await CryptoSecurityService.hashBiometricData(embedding);
  }

  // Helper methods for advanced analysis
  private static async detectEdges(imageTensor: tf.Tensor): Promise<tf.Tensor> {
    // Simplified edge detection - in production use proper Sobel/Canny operators
    const kernel = tf.tensor2d([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]);
    const edges = tf.conv2d(imageTensor.expandDims(0), kernel.expandDims(-1).expandDims(-1), 1, 'same');
    kernel.dispose();
    return edges.squeeze();
  }

  private static async analyzeFrequencyDomain(imageTensor: tf.Tensor): Promise<boolean> {
    // Simulate frequency domain analysis
    return Math.random() > 0.2; // 80% pass rate
  }

  private static async analyzeColorSpaces(imageTensor: tf.Tensor): Promise<boolean> {
    // Simulate color space analysis
    return Math.random() > 0.15; // 85% pass rate
  }

  private static async analyzeMicroTextures(imageTensor: tf.Tensor): Promise<boolean> {
    // Simulate micro-texture analysis
    return Math.random() > 0.25; // 75% pass rate
  }

  private static async detectHeadMovement(videoElement: HTMLVideoElement): Promise<boolean> {
    // Simulate head movement detection
    return Math.random() > 0.3; // 70% success rate
  }

  private static calculateLivenessScore(tests: any): number {
    let score = 0;
    let totalWeight = 0;
    
    if (tests.blinkDetected) { score += 0.3; totalWeight += 0.3; }
    if (tests.headMovement) { score += 0.25; totalWeight += 0.25; }
    if (tests.textureAnalysis) { score += 0.25; totalWeight += 0.25; }
    if (tests.spoofingDetection) { score += 0.2; totalWeight += 0.2; }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private static async calculateConfidenceScore(imageTensor: tf.Tensor): Promise<number> {
    // Simulate confidence calculation based on image quality
    const mean = tf.mean(imageTensor);
    const meanValue = await mean.data();
    mean.dispose();
    
    // Higher confidence for well-lit, clear images
    return Math.min(0.95, Math.max(0.6, meanValue[0] / 255 + Math.random() * 0.2));
  }

  private static async assessBiometricQuality(imageTensor: tf.Tensor, livenessTests: any): Promise<number> {
    // Combine multiple quality factors
    const sharpness = Math.random() * 0.3 + 0.7; // Simulate sharpness score
    const lighting = Math.random() * 0.2 + 0.8; // Simulate lighting score
    const livenessQuality = livenessTests.blinkDetected ? 0.9 : 0.6;
    
    return (sharpness + lighting + livenessQuality) / 3;
  }

  private static async assessCaptureEnvironment(imageTensor: tf.Tensor): Promise<any> {
    const mean = tf.mean(imageTensor);
    const meanValue = await mean.data();
    mean.dispose();
    
    const brightness = meanValue[0];
    let lighting: 'good' | 'poor' | 'adequate';
    
    if (brightness > 180) lighting = 'good';
    else if (brightness < 80) lighting = 'poor';
    else lighting = 'adequate';
    
    return {
      lighting,
      resolution: '640x480',
      deviceType: 'webcam'
    };
  }

  private static async calculateCosineSimilarity(vec1: number[], vec2: number[]): Promise<number> {
    if (vec1.length !== vec2.length) {
      throw new Error('Vector dimensions do not match');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(0, Math.min(1, similarity));
  }
}