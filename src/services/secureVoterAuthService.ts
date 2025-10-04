import { Voter, BiometricData, AuthenticationResult, RegistrationData, ConsentData } from '../types/voter';
import { SecureStorageService } from './secureStorageService';
import { NINValidationService } from './ninValidationService';
import { BiometricSecurityService } from './biometricSecurityService';
import { AuditSecurityService } from './auditSecurityService';
import { CryptoSecurityService } from './cryptoSecurityService';
import { PrivacyComplianceService } from './privacyComplianceService';

export class SecureVoterAuthService {
  private static readonly MAX_LOGIN_ATTEMPTS = 3;
  private static readonly MAX_BIOMETRIC_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Step 1: Validate NIN and check voter registration status
   */
  static async validateNINAndCheckRegistration(nin: string, sessionId: string): Promise<AuthenticationResult> {
    try {
      // Log NIN validation attempt
      await AuditSecurityService.logEvent({
        eventType: 'nin_validation',
        voterNin: await CryptoSecurityService.hashNIN(nin),
        result: 'pending',
        details: `NIN validation initiated`,
        sessionId,
        metadata: { step: 'nin_validation' }
      });

      // Validate NIN format
      if (!this.isValidNINFormat(nin)) {
        await AuditSecurityService.logEvent({
          eventType: 'nin_validation',
          voterNin: await CryptoSecurityService.hashNIN(nin),
          result: 'failure',
          details: 'Invalid NIN format',
          sessionId,
          metadata: { error: 'invalid_format' }
        });
        
        return {
          success: false,
          requiresRegistration: false,
          error: 'Invalid NIN format. NIN must be 11 digits.',
          step: 'nin_validation'
        };
      }

      // Check if voter exists in local database
      const existingVoter = await this.findVoterByNIN(nin);
      
      if (existingVoter) {
        // Check if voter is locked out
        if (await this.isVoterLockedOut(existingVoter)) {
          await AuditSecurityService.logEvent({
            eventType: 'login_attempt',
            userId: existingVoter.id,
            voterNin: await CryptoSecurityService.hashNIN(nin),
            result: 'failure',
            details: 'Account locked due to multiple failed attempts',
            sessionId,
            metadata: { reason: 'account_locked' }
          });

          return {
            success: false,
            requiresRegistration: false,
            error: 'Account temporarily locked due to multiple failed attempts. Please try again later.',
            step: 'nin_validation',
            lockoutTime: new Date(Date.now() + this.LOCKOUT_DURATION)
          };
        }

        // Voter exists - proceed to biometric authentication
        await AuditSecurityService.logEvent({
          eventType: 'nin_validation',
          userId: existingVoter.id,
          voterNin: await CryptoSecurityService.hashNIN(nin),
          result: 'success',
          details: 'NIN found in voter database',
          sessionId,
          metadata: { voter_found: true }
        });

        return {
          success: true,
          voter: existingVoter,
          requiresRegistration: false,
          step: 'biometric_auth',
          attemptsRemaining: this.MAX_BIOMETRIC_ATTEMPTS - existingVoter.biometricAttempts
        };
      }

      // Voter not found - validate NIN with NIMC and initiate registration
      const ninValidation = await NINValidationService.validateNIN(nin);
      
      if (!ninValidation.valid) {
        await AuditSecurityService.logEvent({
          eventType: 'nin_validation',
          voterNin: await CryptoSecurityService.hashNIN(nin),
          result: 'failure',
          details: `NIN validation failed: ${ninValidation.error}`,
          sessionId,
          metadata: { source: ninValidation.source, error: ninValidation.error }
        });

        return {
          success: false,
          requiresRegistration: false,
          error: ninValidation.error || 'NIN validation failed',
          step: 'nin_validation'
        };
      }

      // NIN is valid but voter not registered - initiate registration
      await AuditSecurityService.logEvent({
        eventType: 'nin_validation',
        voterNin: await CryptoSecurityService.hashNIN(nin),
        result: 'success',
        details: 'NIN validated, voter registration required',
        sessionId,
        metadata: { 
          source: ninValidation.source,
          requires_registration: true,
          validation_id: ninValidation.validationId
        }
      });

      return {
        success: true,
        requiresRegistration: true,
        step: 'registration'
      };

    } catch (error) {
      await AuditSecurityService.logEvent({
        eventType: 'nin_validation',
        voterNin: await CryptoSecurityService.hashNIN(nin),
        result: 'failure',
        details: `System error during NIN validation: ${error}`,
        sessionId,
        metadata: { error: error.toString() }
      });

      return {
        success: false,
        requiresRegistration: false,
        error: 'System error during NIN validation. Please try again.',
        step: 'nin_validation'
      };
    }
  }

  /**
   * Step 2: Perform biometric authentication with liveness detection
   */
  static async authenticateWithBiometrics(
    voter: Voter, 
    biometricData: BiometricData, 
    sessionId: string
  ): Promise<AuthenticationResult> {
    try {
      // Log biometric authentication attempt
      await AuditSecurityService.logEvent({
        eventType: 'biometric_capture',
        userId: voter.id,
        voterNin: await CryptoSecurityService.hashNIN(voter.nin),
        result: 'pending',
        details: 'Biometric authentication initiated',
        sessionId,
        metadata: {
          confidence: biometricData.confidence,
          liveness_score: biometricData.livenessScore,
          quality_score: biometricData.qualityScore
        }
      });

      // Validate liveness detection
      const livenessValid = await BiometricSecurityService.validateAdvancedLiveness(biometricData.livenessTests);
      
      if (!livenessValid) {
        await this.incrementBiometricAttempts(voter);
        
        await AuditSecurityService.logEvent({
          eventType: 'biometric_capture',
          userId: voter.id,
          voterNin: await CryptoSecurityService.hashNIN(voter.nin),
          result: 'failure',
          details: 'Liveness detection failed',
          sessionId,
          metadata: {
            liveness_tests: biometricData.livenessTests,
            reason: 'liveness_failed'
          }
        });

        return {
          success: false,
          requiresRegistration: false,
          error: 'Liveness detection failed. Please ensure you blink naturally and look directly at the camera.',
          step: 'biometric_auth',
          attemptsRemaining: this.MAX_BIOMETRIC_ATTEMPTS - voter.biometricAttempts - 1
        };
      }

      // Perform face recognition
      const authResult = await BiometricSecurityService.authenticateVoter(
        biometricData.faceEmbedding,
        voter.faceEmbedding
      );

      if (authResult.match) {
        // Successful authentication - reset attempt counters
        await this.resetAttemptCounters(voter);

        await AuditSecurityService.logEvent({
          eventType: 'login_attempt',
          userId: voter.id,
          voterNin: await CryptoSecurityService.hashNIN(voter.nin),
          result: 'success',
          details: 'Biometric authentication successful',
          sessionId,
          metadata: {
            similarity: authResult.similarity,
            confidence: authResult.confidence,
            liveness_score: biometricData.livenessScore
          }
        });

        return {
          success: true,
          voter,
          requiresRegistration: false,
          step: 'complete'
        };
      } else {
        // Failed authentication
        await this.incrementBiometricAttempts(voter);

        await AuditSecurityService.logEvent({
          eventType: 'login_attempt',
          userId: voter.id,
          voterNin: await CryptoSecurityService.hashNIN(voter.nin),
          result: 'failure',
          details: 'Biometric authentication failed',
          sessionId,
          metadata: {
            similarity: authResult.similarity,
            confidence: authResult.confidence,
            threshold: 0.85,
            attempts_remaining: this.MAX_BIOMETRIC_ATTEMPTS - voter.biometricAttempts - 1
          }
        });

        const attemptsRemaining = this.MAX_BIOMETRIC_ATTEMPTS - voter.biometricAttempts - 1;
        
        return {
          success: false,
          requiresRegistration: false,
          error: `Face verification failed. Similarity: ${(authResult.similarity * 100).toFixed(1)}%. ${attemptsRemaining} attempts remaining.`,
          step: 'biometric_auth',
          attemptsRemaining
        };
      }

    } catch (error) {
      await AuditSecurityService.logEvent({
        eventType: 'biometric_capture',
        userId: voter.id,
        voterNin: await CryptoSecurityService.hashNIN(voter.nin),
        result: 'failure',
        details: `System error during biometric authentication: ${error}`,
        sessionId,
        metadata: { error: error.toString() }
      });

      return {
        success: false,
        requiresRegistration: false,
        error: 'System error during biometric authentication. Please try again.',
        step: 'biometric_auth'
      };
    }
  }

  /**
   * Step 3: Register new voter with complete profile and biometric data
   */
  static async registerNewVoter(
    registrationData: RegistrationData,
    sessionId: string
  ): Promise<AuthenticationResult> {
    try {
      // Check if voter already exists
      const existingVoter = await this.findVoterByNIN(registrationData.nin);
      if (existingVoter) {
        return {
          success: false,
          requiresRegistration: false,
          error: 'A voter with this NIN is already registered.',
          step: 'registration'
        };
      }

      // Validate consent requirements
      if (!PrivacyComplianceService.validateConsent(registrationData.consentData)) {
        await AuditSecurityService.logEvent({
          eventType: 'registration',
          voterNin: await CryptoSecurityService.hashNIN(registrationData.nin),
          result: 'failure',
          details: 'Privacy consent validation failed',
          sessionId,
          metadata: { reason: 'consent_invalid' }
        });

        return {
          success: false,
          requiresRegistration: true,
          error: 'Privacy consent is required to complete registration.',
          step: 'registration'
        };
      }

      // Validate biometric quality
      if (!BiometricSecurityService.validateBiometricQuality(registrationData.biometricData)) {
        await AuditSecurityService.logEvent({
          eventType: 'registration',
          voterNin: await CryptoSecurityService.hashNIN(registrationData.nin),
          result: 'failure',
          details: 'Biometric quality validation failed',
          sessionId,
          metadata: { 
            quality_score: registrationData.biometricData.qualityScore,
            confidence: registrationData.biometricData.confidence
          }
        });

        return {
          success: false,
          requiresRegistration: true,
          error: 'Biometric capture quality is insufficient. Please try again with better lighting.',
          step: 'registration'
        };
      }

      // Create new voter record
      const newVoter: Voter = {
        id: crypto.randomUUID(),
        nin: await CryptoSecurityService.encryptNIN(registrationData.nin),
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        dateOfBirth: registrationData.dateOfBirth,
        sex: registrationData.sex,
        email: registrationData.email,
        phone: registrationData.phone,
        state: registrationData.state,
        lga: registrationData.lga,
        ward: registrationData.ward,
        pollingUnit: registrationData.pollingUnit,
        
        // Encrypted biometric data
        biometricHash: await BiometricSecurityService.generateBiometricHash(registrationData.biometricData.faceEmbedding),
        faceEmbedding: await CryptoSecurityService.encryptBiometricData(registrationData.biometricData.faceEmbedding),
        biometricQuality: registrationData.biometricData.qualityScore,
        
        // Registration metadata
        registrationDate: new Date(),
        isVerified: true,
        isActive: true,
        eligibleElections: [],
        hasVoted: {},
        loginAttempts: 0,
        biometricAttempts: 0,
        registrationSource: navigator.onLine ? 'online' : 'offline',
        
        // Privacy compliance
        consentGiven: true,
        consentDate: registrationData.consentData.consentDate,
        consentVersion: registrationData.consentData.consentVersion,
        dataProcessingAgreement: registrationData.consentData.dataProcessingConsent,
        
        // Hash chain for tamper evidence
        previousHash: await this.getLastVoterHash(),
        currentHash: ''
      };

      // Generate current hash
      newVoter.currentHash = await this.generateVoterHash(newVoter);

      // Store voter securely
      await SecureStorageService.storeVoter(newVoter);

      // Log successful registration
      await AuditSecurityService.logEvent({
        eventType: 'registration',
        userId: newVoter.id,
        voterNin: await CryptoSecurityService.hashNIN(registrationData.nin),
        result: 'success',
        details: 'Voter registration completed successfully',
        sessionId,
        metadata: {
          registration_source: newVoter.registrationSource,
          biometric_quality: registrationData.biometricData.qualityScore,
          liveness_score: registrationData.biometricData.livenessScore,
          consent_version: registrationData.consentData.consentVersion
        }
      });

      // Log consent separately for compliance
      await AuditSecurityService.logEvent({
        eventType: 'consent_given',
        userId: newVoter.id,
        voterNin: await CryptoSecurityService.hashNIN(registrationData.nin),
        result: 'success',
        details: 'Privacy consent recorded',
        sessionId,
        metadata: {
          consent_data: registrationData.consentData,
          ip_address: registrationData.consentData.ipAddress,
          user_agent: registrationData.consentData.userAgent
        }
      });

      return {
        success: true,
        voter: newVoter,
        requiresRegistration: false,
        step: 'complete'
      };

    } catch (error) {
      await AuditSecurityService.logEvent({
        eventType: 'registration',
        voterNin: await CryptoSecurityService.hashNIN(registrationData.nin),
        result: 'failure',
        details: `System error during voter registration: ${error}`,
        sessionId,
        metadata: { error: error.toString() }
      });

      return {
        success: false,
        requiresRegistration: true,
        error: 'System error during registration. Please try again.',
        step: 'registration'
      };
    }
  }

  // Helper Methods
  private static isValidNINFormat(nin: string): boolean {
    return /^\d{11}$/.test(nin);
  }

  private static async findVoterByNIN(nin: string): Promise<Voter | null> {
    return await SecureStorageService.findVoterByNIN(nin);
  }

  private static async isVoterLockedOut(voter: Voter): Promise<boolean> {
    const now = new Date();
    const lastAttempt = voter.lastBiometricAttempt || voter.lastLoginAttempt;
    
    if (!lastAttempt) return false;
    
    const timeSinceLastAttempt = now.getTime() - new Date(lastAttempt).getTime();
    const isWithinLockoutPeriod = timeSinceLastAttempt < this.LOCKOUT_DURATION;
    
    const totalAttempts = (voter.loginAttempts || 0) + (voter.biometricAttempts || 0);
    
    return totalAttempts >= this.MAX_LOGIN_ATTEMPTS && isWithinLockoutPeriod;
  }

  private static async incrementBiometricAttempts(voter: Voter): Promise<void> {
    voter.biometricAttempts = (voter.biometricAttempts || 0) + 1;
    voter.lastBiometricAttempt = new Date();
    await SecureStorageService.updateVoter(voter);
  }

  private static async resetAttemptCounters(voter: Voter): Promise<void> {
    voter.loginAttempts = 0;
    voter.biometricAttempts = 0;
    voter.lastLoginAttempt = undefined;
    voter.lastBiometricAttempt = undefined;
    await SecureStorageService.updateVoter(voter);
  }

  private static async getLastVoterHash(): Promise<string> {
    const lastVoter = await SecureStorageService.getLastVoter();
    return lastVoter?.currentHash || '0';
  }

  private static async generateVoterHash(voter: Voter): Promise<string> {
    const voterData = {
      id: voter.id,
      nin: voter.nin,
      registrationDate: voter.registrationDate,
      previousHash: voter.previousHash
    };
    return await CryptoSecurityService.generateHash(JSON.stringify(voterData));
  }
}