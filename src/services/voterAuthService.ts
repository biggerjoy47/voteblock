import { Voter, BiometricData } from '../types';
import { StorageService } from './storageService';
import { NINService } from './ninService';
import { BiometricService } from './biometricService';
import { CryptoService } from './cryptoService';
import { AuditService } from './auditService';

export interface AuthenticationResult {
  success: boolean;
  voter?: Voter;
  requiresRegistration: boolean;
  error?: string;
  step: 'nin_check' | 'biometric_auth' | 'registration' | 'complete';
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
}

export class VoterAuthService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly MAX_BIOMETRIC_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Step 1: Verify NIN exists in database
   */
  static async verifyNIN(nin: string): Promise<{
    exists: boolean;
    voter?: Voter;
    error?: string;
  }> {
    try {
      // Log NIN verification attempt
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
        `NIN verification attempted: ${nin.slice(0, 3)}***${nin.slice(-2)}`,
        'pending',
        { step: 'nin_verification' },
        nin
      );

      // First validate NIN format and with NIMC
      const ninValidation = await NINService.validateNIN(nin);
      if (!ninValidation.valid) {
        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
          `NIN validation failed: ${nin.slice(0, 3)}***${nin.slice(-2)} - ${ninValidation.error}`,
          'failure',
          { step: 'nin_validation', error: ninValidation.error },
          nin
        );
        
        return {
          exists: false,
          error: ninValidation.error
        };
      }

      // Check if voter exists in database
      const voters = await StorageService.getAllFromStore('voters') as Voter[];
      const existingVoter = voters.find(v => v.nin === nin);

      if (existingVoter) {
        // Check if voter is locked out
        if (await this.isVoterLockedOut(existingVoter)) {
          await AuditService.logEvent(
            'voter',
            AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
            `Voter locked out: ${nin.slice(0, 3)}***${nin.slice(-2)}`,
            'failure',
            { step: 'lockout_check', reason: 'too_many_attempts' },
            nin
          );

          return {
            exists: true,
            voter: existingVoter,
            error: 'Account temporarily locked due to multiple failed attempts. Please try again later.'
          };
        }

        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
          `NIN found in database: ${nin.slice(0, 3)}***${nin.slice(-2)}`,
          'success',
          { step: 'nin_verification', voterId: existingVoter.id },
          nin
        );

        return {
          exists: true,
          voter: existingVoter
        };
      }

      // NIN valid but not in voter database - needs registration
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
        `NIN not found in voter database: ${nin.slice(0, 3)}***${nin.slice(-2)}`,
        'success',
        { step: 'nin_verification', requiresRegistration: true },
        nin
      );

      return {
        exists: false
      };
    } catch (error) {
      console.error('Error verifying NIN:', error);
      
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.VOTER_LOGIN_ATTEMPT,
        `NIN verification system error: ${nin.slice(0, 3)}***${nin.slice(-2)}`,
        'failure',
        { step: 'nin_verification', error: error.toString() },
        nin
      );

      return {
        exists: false,
        error: 'System error during NIN verification. Please try again.'
      };
    }
  }

  /**
   * Step 2: Perform biometric authentication with liveness detection
   */
  static async authenticateBiometric(voter: Voter, biometricData: BiometricData): Promise<{
    success: boolean;
    requiresRegistration: boolean;
    error?: string;
    similarity?: number;
  }> {
    try {
      // Log biometric authentication attempt
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
        `Biometric authentication attempted for voter: ${voter.firstName} ${voter.lastName}`,
        'pending',
        { 
          step: 'biometric_auth',
          confidence: biometricData.confidence,
          livenessScore: biometricData.livenessScore,
          livenessTests: biometricData.livenessTests
        },
        voter.nin
      );

      // Validate liveness detection first
      const livenessValid = await BiometricService.validateEnhancedLiveness(biometricData.livenessTests);
      if (!livenessValid) {
        // Increment biometric attempts
        await this.incrementBiometricAttempts(voter);

        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.LIVENESS_CHECK,
          `Liveness detection failed for voter: ${voter.firstName} ${voter.lastName}`,
          'failure',
          { 
            livenessTests: biometricData.livenessTests,
            reason: 'liveness_validation_failed'
          },
          voter.nin
        );

        return {
          success: false,
          requiresRegistration: false,
          error: 'Liveness detection failed. Please ensure you blink naturally and look directly at the camera.'
        };
      }

      // Log successful liveness check
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.LIVENESS_CHECK,
        `Liveness detection passed: blinks=${biometricData.livenessTests.eyeBlinkCount}, duration=${biometricData.livenessTests.blinkDuration}ms`,
        'success',
        { livenessTests: biometricData.livenessTests },
        voter.nin
      );

      // Compare face embeddings
      if (!voter.faceEmbedding || voter.faceEmbedding.length === 0) {
        // No stored biometric data - voter needs to complete registration
        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
          `No stored biometric data for voter: ${voter.firstName} ${voter.lastName}`,
          'failure',
          { reason: 'no_stored_biometric' },
          voter.nin
        );

        return {
          success: false,
          requiresRegistration: true,
          error: 'No biometric data found. Please complete your registration.'
        };
      }

      const authResult = await BiometricService.authenticateVoter(
        biometricData.faceEmbedding,
        voter.faceEmbedding
      );

      if (authResult.match) {
        // Successful authentication - reset attempt counters
        await this.resetAttemptCounters(voter);

        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
          `Biometric authentication successful for voter: ${voter.firstName} ${voter.lastName}`,
          'success',
          { 
            similarity: authResult.similarity,
            confidence: authResult.confidence
          },
          voter.nin
        );

        return {
          success: true,
          requiresRegistration: false,
          similarity: authResult.similarity
        };
      } else {
        // Failed authentication - increment attempts
        await this.incrementBiometricAttempts(voter);

        await AuditService.logEvent(
          'voter',
          AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
          `Biometric authentication failed for voter: ${voter.firstName} ${voter.lastName}`,
          'failure',
          { 
            similarity: authResult.similarity,
            confidence: authResult.confidence,
            threshold: 0.85
          },
          voter.nin
        );

        return {
          success: false,
          requiresRegistration: false,
          error: `Face verification failed. Similarity: ${(authResult.similarity * 100).toFixed(1)}% (Required: 70%)`,
          similarity: authResult.similarity
        };
      }
    } catch (error) {
      console.error('Error in biometric authentication:', error);
      
      await AuditService.logEvent(
        'voter',
        AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
        `Biometric authentication system error for voter: ${voter.firstName} ${voter.lastName}`,
        'failure',
        { error: error.toString() },
        voter.nin
      );

      return {
        success: false,
        requiresRegistration: false,
        error: 'System error during biometric authentication. Please try again.'
      };
    }
  }

  /**
   * Step 3: Register new voter
   */
  static async registerVoter(registrationData: RegistrationData): Promise<{
    success: boolean;
    voter?: Voter;
    error?: string;
  }> {
    try {
      // Check if voter already exists
      const existingCheck = await this.verifyNIN(registrationData.nin);
      if (existingCheck.exists && existingCheck.voter) {
        // If voter exists but has no biometric data, update their record
        if (!existingCheck.voter.faceEmbedding || existingCheck.voter.faceEmbedding.length === 0) {
          return await this.updateVoterBiometric(existingCheck.voter, registrationData.biometricData);
        } else {
          return {
            success: false,
            error: 'Voter already registered with biometric data.'
          };
        }
      }

      // Create new voter record
      const newVoter: Voter = {
        id: crypto.randomUUID(),
        nin: registrationData.nin,
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
        biometricHash: await BiometricService.generateBiometricHash(registrationData.biometricData.faceEmbedding),
        faceEmbedding: registrationData.biometricData.faceEmbedding,
        registrationDate: new Date(),
        isVerified: true,
        isActive: true,
        eligibleElections: [],
        hasVoted: {},
        loginAttempts: 0,
        biometricAttempts: 0
      };

      await StorageService.addToStore('voters', newVoter);

      // Log successful registration
      await AuditService.logEvent(
        'system',
        AuditService.ACTIONS.VOTER_REGISTRATION,
        `New voter registered: ${newVoter.firstName} ${newVoter.lastName}`,
        'success',
        { 
          voterData: {
            id: newVoter.id,
            nin: newVoter.nin.slice(0, 3) + '***' + newVoter.nin.slice(-2),
            state: newVoter.state,
            lga: newVoter.lga
          },
          biometricQuality: {
            confidence: registrationData.biometricData.confidence,
            livenessScore: registrationData.biometricData.livenessScore
          }
        },
        newVoter.nin
      );

      return {
        success: true,
        voter: newVoter
      };
    } catch (error) {
      console.error('Error registering voter:', error);
      
      await AuditService.logEvent(
        'system',
        AuditService.ACTIONS.VOTER_REGISTRATION,
        `Voter registration failed: ${registrationData.firstName} ${registrationData.lastName}`,
        'failure',
        { error: error.toString() },
        registrationData.nin
      );

      return {
        success: false,
        error: 'System error during voter registration. Please try again.'
      };
    }
  }

  /**
   * Update existing voter with biometric data
   */
  private static async updateVoterBiometric(voter: Voter, biometricData: BiometricData): Promise<{
    success: boolean;
    voter?: Voter;
    error?: string;
  }> {
    try {
      const updatedVoter: Voter = {
        ...voter,
        dateOfBirth: biometricData.timestamp, // This should be updated with actual DOB from registration
        sex: 'male', // This should be updated with actual sex from registration
        biometricHash: await BiometricService.generateBiometricHash(biometricData.faceEmbedding),
        faceEmbedding: biometricData.faceEmbedding,
        isVerified: true,
        loginAttempts: 0,
        biometricAttempts: 0
      };

      await StorageService.updateInStore('voters', updatedVoter);

      await AuditService.logEvent(
        'system',
        AuditService.ACTIONS.VOTER_REGISTRATION,
        `Voter biometric data updated: ${voter.firstName} ${voter.lastName}`,
        'success',
        { 
          voterId: voter.id,
          biometricQuality: {
            confidence: biometricData.confidence,
            livenessScore: biometricData.livenessScore
          }
        },
        voter.nin
      );

      return {
        success: true,
        voter: updatedVoter
      };
    } catch (error) {
      console.error('Error updating voter biometric:', error);
      return {
        success: false,
        error: 'Failed to update biometric data.'
      };
    }
  }

  /**
   * Check if voter is locked out due to failed attempts
   */
  private static async isVoterLockedOut(voter: Voter): Promise<boolean> {
    const now = new Date();
    const lastAttempt = voter.lastBiometricAttempt || voter.lastLoginAttempt;
    
    if (!lastAttempt) return false;
    
    const timeSinceLastAttempt = now.getTime() - new Date(lastAttempt).getTime();
    const isWithinLockoutPeriod = timeSinceLastAttempt < this.LOCKOUT_DURATION;
    
    const totalAttempts = (voter.loginAttempts || 0) + (voter.biometricAttempts || 0);
    
    return totalAttempts >= this.MAX_LOGIN_ATTEMPTS && isWithinLockoutPeriod;
  }

  /**
   * Increment biometric attempt counter
   */
  private static async incrementBiometricAttempts(voter: Voter): Promise<void> {
    try {
      const updatedVoter: Voter = {
        ...voter,
        biometricAttempts: (voter.biometricAttempts || 0) + 1,
        lastBiometricAttempt: new Date()
      };

      await StorageService.updateInStore('voters', updatedVoter);
    } catch (error) {
      console.error('Error incrementing biometric attempts:', error);
    }
  }

  /**
   * Reset attempt counters after successful authentication
   */
  private static async resetAttemptCounters(voter: Voter): Promise<void> {
    try {
      const updatedVoter: Voter = {
        ...voter,
        loginAttempts: 0,
        biometricAttempts: 0,
        lastLoginAttempt: undefined,
        lastBiometricAttempt: undefined
      };

      await StorageService.updateInStore('voters', updatedVoter);
    } catch (error) {
      console.error('Error resetting attempt counters:', error);
    }
  }

  /**
   * Get authentication statistics for monitoring
   */
  static async getAuthStats(): Promise<{
    totalAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    lockedAccounts: number;
    biometricSuccessRate: number;
    livenessSuccessRate: number;
  }> {
    try {
      const voters = await StorageService.getAllFromStore('voters') as Voter[];
      const now = new Date();
      
      // Get recent authentication logs
      const authLogs = await AuditService.getAuditLogs({
        action: AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
      });

      const livenessLogs = await AuditService.getAuditLogs({
        action: AuditService.ACTIONS.LIVENESS_CHECK,
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000)
      });

      const successfulLogins = authLogs.filter(log => log.result === 'success').length;
      const failedLogins = authLogs.filter(log => log.result === 'failure').length;
      const successfulLiveness = livenessLogs.filter(log => log.result === 'success').length;

      const lockedAccounts = voters.filter(voter => 
        this.isVoterLockedOut(voter)
      ).length;

      return {
        totalAttempts: authLogs.length,
        successfulLogins,
        failedLogins,
        lockedAccounts,
        biometricSuccessRate: authLogs.length > 0 ? (successfulLogins / authLogs.length) * 100 : 0,
        livenessSuccessRate: livenessLogs.length > 0 ? (successfulLiveness / livenessLogs.length) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting auth stats:', error);
      return {
        totalAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        lockedAccounts: 0,
        biometricSuccessRate: 0,
        livenessSuccessRate: 0
      };
    }
  }
}