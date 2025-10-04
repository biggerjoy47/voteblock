// Enhanced Voter Authentication System Types
export interface Voter {
  id: string;
  nin: string; // National Identification Number (encrypted)
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female';
  email?: string;
  phone?: string;
  state: string;
  lga: string;
  ward: string;
  pollingUnit: string;
  
  // Biometric Data (encrypted)
  biometricHash: string;
  faceEmbedding: number[]; // Encrypted face embedding
  biometricQuality: number; // Quality score of biometric capture
  
  // Registration & Status
  registrationDate: Date;
  isVerified: boolean;
  isActive: boolean;
  eligibleElections: string[];
  hasVoted: { [electionId: string]: boolean };
  
  // Security & Audit
  loginAttempts: number;
  biometricAttempts: number;
  lastLoginAttempt?: Date;
  lastBiometricAttempt?: Date;
  registrationSource: 'online' | 'offline';
  
  // Privacy Compliance
  consentGiven: boolean;
  consentDate?: Date;
  consentVersion: string;
  dataProcessingAgreement: boolean;
  
  // Hash Chain for Tamper Evidence
  previousHash?: string;
  currentHash: string;
}

export interface BiometricData {
  faceEmbedding: number[];
  confidence: number;
  livenessScore: number;
  qualityScore: number;
  livenessTests: {
    blinkDetected: boolean;
    headMovement: boolean;
    textureAnalysis: boolean;
    eyeBlinkCount: number;
    eyeAspectRatio: number[];
    blinkDuration: number;
    spoofingDetection: boolean;
  };
  timestamp: Date;
  captureEnvironment: {
    lighting: 'good' | 'poor' | 'adequate';
    resolution: string;
    deviceType: string;
  };
}

export interface AuthenticationResult {
  success: boolean;
  voter?: Voter;
  requiresRegistration: boolean;
  error?: string;
  step: 'nin_validation' | 'biometric_auth' | 'registration' | 'complete';
  attemptsRemaining?: number;
  lockoutTime?: Date;
}

export interface RegistrationData {
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female';
  email?: string;
  phone?: string;
  state: string;
  lga: string;
  ward: string;
  pollingUnit: string;
  biometricData: BiometricData;
  consentData: ConsentData;
}

export interface ConsentData {
  dataProcessingConsent: boolean;
  biometricConsent: boolean;
  storageConsent: boolean;
  consentVersion: string;
  consentDate: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface NINValidationResult {
  valid: boolean;
  voterData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    sex: 'male' | 'female';
    state: string;
    lga: string;
  };
  source: 'nimc_api' | 'offline_registry';
  error?: string;
  validationId: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'login_attempt' | 'registration' | 'biometric_capture' | 'nin_validation' | 'consent_given' | 'vote_cast';
  userId?: string;
  voterNin?: string; // Hashed NIN for privacy
  result: 'success' | 'failure' | 'pending';
  details: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
  previousHash?: string;
  currentHash: string;
}

export interface SystemConfig {
  security: {
    maxLoginAttempts: number;
    maxBiometricAttempts: number;
    lockoutDurationMinutes: number;
    biometricThreshold: number;
    livenessThreshold: number;
    encryptionAlgorithm: string;
  };
  privacy: {
    consentVersion: string;
    dataRetentionDays: number;
    anonymizationEnabled: boolean;
  };
  offline: {
    syncIntervalMinutes: number;
    maxOfflineRegistrations: number;
    compressionEnabled: boolean;
  };
}
</parameter>