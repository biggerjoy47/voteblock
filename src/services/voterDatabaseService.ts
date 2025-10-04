import { StorageService } from './storageService';
import { CryptoService } from './cryptoService';
import { AuditService } from './auditService';
import { TransactionManager } from './transactionManager';
import { EnhancedBlockchainService } from './enhancedBlockchainService';

export interface VoterRecord {
  id: string;
  nin: string;
  ninHash: string; // For secure lookups
  firstName: string;
  lastName: string;
  sex: 'male' | 'female';
  dateOfBirth: Date;
  state: string;
  lga: string;
  ward: string;
  pollingUnit: string;
  email?: string;
  phone?: string;
  
  // Biometric data (encrypted)
  faceEmbedding: number[];
  biometricHash: string;
  biometricQuality: number;
  
  // Registration metadata
  registrationDate: Date;
  isVerified: boolean;
  isActive: boolean;
  registrationSource: 'online' | 'offline';
  
  // Voting status
  eligibleElections: string[];
  votingHistory: { [electionId: string]: { voted: boolean; timestamp?: Date; receiptCode?: string } };
  
  // Security
  loginAttempts: number;
  lastLoginAttempt?: Date;
  biometricAttempts: number;
  lastBiometricAttempt?: Date;
}

export interface VoterStats {
  totalVoters: number;
  verifiedVoters: number;
  activeVoters: number;
  suspendedVoters: number;
  votersByState: { [state: string]: number };
  votersByLGA: { [lga: string]: number };
  registrationTrends: { date: string; count: number }[];
  ageDistribution: { ageGroup: string; count: number }[];
  genderDistribution: { male: number; female: number };
  votingParticipation: { [electionId: string]: { eligible: number; voted: number; percentage: number } };
}

export class VoterDatabaseService {
  private static readonly VOTER_STORE = 'voters';
  private static readonly NIN_INDEX = 'nin_index';

  /**
   * Register a new voter in the database
   */
  static async registerVoter(voterData: {
    nin: string;
    firstName: string;
    lastName: string;
    sex: 'male' | 'female';
    dateOfBirth: Date;
    state: string;
    lga: string;
    ward: string;
    pollingUnit: string;
    email?: string;
    phone?: string;
    faceEmbedding: number[];
    biometricQuality: number;
  }): Promise<{ success: boolean; voter?: VoterRecord; error?: string }> {
    try {
      // Check if voter already exists
      const existingVoter = await this.findVoterByNIN(voterData.nin);
      if (existingVoter) {
        return {
          success: false,
          error: 'A voter with this NIN is already registered.'
        };
      }

      // Create voter record
      const voter: VoterRecord = {
        id: crypto.randomUUID(),
        nin: voterData.nin,
        ninHash: await CryptoService.generateHash(voterData.nin + 'VOTER_SALT'),
        firstName: voterData.firstName,
        lastName: voterData.lastName,
        sex: voterData.sex,
        dateOfBirth: voterData.dateOfBirth,
        state: voterData.state,
        lga: voterData.lga,
        ward: voterData.ward,
        pollingUnit: voterData.pollingUnit,
        email: voterData.email,
        phone: voterData.phone,
        
        // Encrypted biometric data
        faceEmbedding: voterData.faceEmbedding,
        biometricHash: await CryptoService.hashBiometricData(voterData.faceEmbedding),
        biometricQuality: voterData.biometricQuality,
        
        registrationDate: new Date(),
        isVerified: true,
        isActive: true,
        registrationSource: navigator.onLine ? 'online' : 'offline',
        
        eligibleElections: [],
        votingHistory: {},
        
        loginAttempts: 0,
        biometricAttempts: 0
      };

      // Store voter
      await StorageService.addToStore(this.VOTER_STORE, voter);
      
      // Create NIN index for fast lookups
      await this.updateNINIndex(voter.ninHash, voter.id);

      // Log registration
      await AuditService.logEvent(
        'system',
        'voter_registration',
        `New voter registered: ${voter.firstName} ${voter.lastName} from ${voter.state}`,
        'success',
        { 
          voterId: voter.id,
          state: voter.state,
          lga: voter.lga,
          registrationSource: voter.registrationSource
        }
      );

      // Create blockchain transaction for voter registration
      try {
        const transaction = await TransactionManager.createTransaction(
          'voter_register',
          'system',
          {
            voterId: voter.id,
            ninHash: voter.ninHash,
            firstName: voter.firstName,
            lastName: voter.lastName,
            state: voter.state,
            lga: voter.lga,
            ward: voter.ward,
            pollingUnit: voter.pollingUnit,
            registrationDate: voter.registrationDate,
            biometricHash: voter.biometricHash
          }
        );

        await TransactionManager.submitTransaction(transaction);
        
        // Process transaction batch if enough pending transactions
        await EnhancedBlockchainService.processTransactionBatch();
      } catch (blockchainError) {
        console.error('Failed to record voter registration on blockchain:', blockchainError);
        // Continue anyway - voter is registered in database
      }

      return { success: true, voter };
    } catch (error) {
      console.error('Error registering voter:', error);
      return {
        success: false,
        error: 'Failed to register voter. Please try again.'
      };
    }
  }

  /**
   * Find voter by NIN for authentication
   */
  static async findVoterByNIN(nin: string): Promise<VoterRecord | null> {
    try {
      const ninHash = await CryptoService.generateHash(nin + 'VOTER_SALT');
      const ninIndex = await StorageService.getItem(this.NIN_INDEX) || {};
      const voterId = ninIndex[ninHash];
      
      if (!voterId) {
        return null;
      }

      return await StorageService.getFromStore(this.VOTER_STORE, voterId);
    } catch (error) {
      console.error('Error finding voter by NIN:', error);
      return null;
    }
  }

  /**
   * Authenticate voter with biometric data
   */
  static async authenticateVoter(nin: string, capturedEmbedding: number[]): Promise<{
    success: boolean;
    voter?: VoterRecord;
    similarity?: number;
    error?: string;
  }> {
    try {
      const voter = await this.findVoterByNIN(nin);
      if (!voter) {
        return {
          success: false,
          error: 'Voter not found. Please register first.'
        };
      }

      if (!voter.isActive) {
        return {
          success: false,
          error: 'Voter account is suspended. Please contact INEC.'
        };
      }

      // Check if voter is locked out
      if (await this.isVoterLockedOut(voter)) {
        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts.'
        };
      }

      // Compare biometric data
      const similarity = await this.compareBiometricData(capturedEmbedding, voter.faceEmbedding);
      const threshold = 0.70; // 70% similarity threshold

      if (similarity >= threshold) {
        // Reset attempt counters on successful login
        await this.resetLoginAttempts(voter);
        
        await AuditService.logEvent(
          voter.id,
          'voter_login_success',
          `Voter authenticated: ${voter.firstName} ${voter.lastName}`,
          'success',
          { similarity, threshold }
        );

        return {
          success: true,
          voter,
          similarity
        };
      } else {
        // Increment failed attempts
        await this.incrementLoginAttempts(voter);
        
        await AuditService.logEvent(
          voter.id,
          'voter_login_failure',
          `Biometric authentication failed: ${voter.firstName} ${voter.lastName}`,
          'failure',
          { similarity, threshold, attemptsRemaining: 5 - voter.loginAttempts }
        );

        return {
          success: false,
          similarity,
          error: `Biometric verification failed. Similarity: ${(similarity * 100).toFixed(1)}%`
        };
      }
    } catch (error) {
      console.error('Error authenticating voter:', error);
      return {
        success: false,
        error: 'Authentication system error. Please try again.'
      };
    }
  }

  /**
   * Update voter's voting status
   */
  static async recordVote(voterId: string, electionId: string, receiptCode: string): Promise<void> {
    try {
      const voter = await StorageService.getFromStore(this.VOTER_STORE, voterId);
      if (!voter) return;

      voter.votingHistory[electionId] = {
        voted: true,
        timestamp: new Date(),
        receiptCode
      };

      await StorageService.updateInStore(this.VOTER_STORE, voter);
    } catch (error) {
      console.error('Error recording vote:', error);
    }
  }

  /**
   * Get comprehensive voter statistics
   */
  static async getVoterStatistics(): Promise<VoterStats> {
    try {
      const allVoters = await StorageService.getAllFromStore(this.VOTER_STORE) as VoterRecord[];
      const allElections = await StorageService.getAllFromStore('elections');

      // Basic counts
      const totalVoters = allVoters.length;
      const verifiedVoters = allVoters.filter(v => v.isVerified).length;
      const activeVoters = allVoters.filter(v => v.isActive).length;
      const suspendedVoters = allVoters.filter(v => !v.isActive).length;

      // Voters by state
      const votersByState: { [state: string]: number } = {};
      allVoters.forEach(voter => {
        votersByState[voter.state] = (votersByState[voter.state] || 0) + 1;
      });

      // Voters by LGA
      const votersByLGA: { [lga: string]: number } = {};
      allVoters.forEach(voter => {
        const key = `${voter.state} - ${voter.lga}`;
        votersByLGA[key] = (votersByLGA[key] || 0) + 1;
      });

      // Registration trends (last 30 days)
      const registrationTrends: { date: string; count: number }[] = [];
      const last30Days = Array.from({length: 30}, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      last30Days.forEach(date => {
        const count = allVoters.filter(voter => 
          voter.registrationDate.toISOString().split('T')[0] === date
        ).length;
        registrationTrends.push({ date, count });
      });

      // Age distribution
      const ageDistribution: { ageGroup: string; count: number }[] = [];
      const ageGroups = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
      
      ageGroups.forEach(group => {
        const [min, max] = group === '65+' ? [65, 150] : group.split('-').map(Number);
        const count = allVoters.filter(voter => {
          const age = new Date().getFullYear() - voter.dateOfBirth.getFullYear();
          return age >= min && (max ? age <= max : true);
        }).length;
        ageDistribution.push({ ageGroup: group, count });
      });

      // Gender distribution
      const genderDistribution = {
        male: allVoters.filter(v => v.sex === 'male').length,
        female: allVoters.filter(v => v.sex === 'female').length
      };

      // Voting participation by election
      const votingParticipation: { [electionId: string]: { eligible: number; voted: number; percentage: number } } = {};
      allElections.forEach(election => {
        const eligibleVoters = allVoters.filter(voter => 
          voter.isActive && voter.isVerified
        );
        const votedCount = eligibleVoters.filter(voter => 
          voter.votingHistory[election.id]?.voted
        ).length;
        
        votingParticipation[election.id] = {
          eligible: eligibleVoters.length,
          voted: votedCount,
          percentage: eligibleVoters.length > 0 ? (votedCount / eligibleVoters.length) * 100 : 0
        };
      });

      return {
        totalVoters,
        verifiedVoters,
        activeVoters,
        suspendedVoters,
        votersByState,
        votersByLGA,
        registrationTrends,
        ageDistribution,
        genderDistribution,
        votingParticipation
      };
    } catch (error) {
      console.error('Error getting voter statistics:', error);
      return {
        totalVoters: 0,
        verifiedVoters: 0,
        activeVoters: 0,
        suspendedVoters: 0,
        votersByState: {},
        votersByLGA: {},
        registrationTrends: [],
        ageDistribution: [],
        genderDistribution: { male: 0, female: 0 },
        votingParticipation: {}
      };
    }
  }

  /**
   * Get voters by state for admin analytics
   */
  static async getVotersByState(state?: string): Promise<VoterRecord[]> {
    try {
      const allVoters = await StorageService.getAllFromStore(this.VOTER_STORE) as VoterRecord[];
      
      if (state) {
        return allVoters.filter(voter => voter.state === state);
      }
      
      return allVoters;
    } catch (error) {
      console.error('Error getting voters by state:', error);
      return [];
    }
  }

  /**
   * Update voter's eligible elections when admin creates/activates elections
   */
  static async updateVoterEligibility(electionId: string, _electionType: string, state?: string, lga?: string): Promise<void> {
    try {
      const allVoters = await StorageService.getAllFromStore(this.VOTER_STORE) as VoterRecord[];
      
      // Filter eligible voters based on election scope
      let eligibleVoters = allVoters.filter(voter => voter.isActive && voter.isVerified);
      
      if (state) {
        eligibleVoters = eligibleVoters.filter(voter => voter.state === state);
      }
      
      if (lga) {
        eligibleVoters = eligibleVoters.filter(voter => voter.lga === lga);
      }

      // Update each eligible voter
      for (const voter of eligibleVoters) {
        if (!voter.eligibleElections.includes(electionId)) {
          voter.eligibleElections.push(electionId);
          voter.votingHistory[electionId] = { voted: false };
          await StorageService.updateInStore(this.VOTER_STORE, voter);
        }
      }

      console.log(`Updated eligibility for ${eligibleVoters.length} voters for election ${electionId}`);
    } catch (error) {
      console.error('Error updating voter eligibility:', error);
    }
  }

  /**
   * Get eligible voters for a specific election
   */
  static async getEligibleVoters(electionId: string): Promise<VoterRecord[]> {
    try {
      const allVoters = await StorageService.getAllFromStore(this.VOTER_STORE) as VoterRecord[];
      return allVoters.filter(voter => 
        voter.eligibleElections.includes(electionId) && 
        voter.isActive && 
        voter.isVerified
      );
    } catch (error) {
      console.error('Error getting eligible voters:', error);
      return [];
    }
  }

  /**
   * Check if voter has voted in specific election
   */
  static async hasVoterVoted(voterId: string, electionId: string): Promise<boolean> {
    try {
      const voter = await StorageService.getFromStore(this.VOTER_STORE, voterId);
      return voter?.votingHistory[electionId]?.voted || false;
    } catch (error) {
      console.error('Error checking vote status:', error);
      return false;
    }
  }

  // Helper methods
  private static async updateNINIndex(ninHash: string, voterId: string): Promise<void> {
    const index = await StorageService.getItem(this.NIN_INDEX) || {};
    index[ninHash] = voterId;
    await StorageService.setItem(this.NIN_INDEX, index);
  }

  private static async compareBiometricData(embedding1: number[], embedding2: number[]): Promise<number> {
    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < Math.min(embedding1.length, embedding2.length); i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(0, Math.min(1, similarity));
  }

  private static async isVoterLockedOut(voter: VoterRecord): Promise<boolean> {
    const maxAttempts = 5;
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes
    
    if (voter.loginAttempts < maxAttempts) return false;
    
    const lastAttempt = voter.lastLoginAttempt || voter.lastBiometricAttempt;
    if (!lastAttempt) return false;
    
    const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();
    return timeSinceLastAttempt < lockoutDuration;
  }

  private static async incrementLoginAttempts(voter: VoterRecord): Promise<void> {
    voter.loginAttempts = (voter.loginAttempts || 0) + 1;
    voter.lastLoginAttempt = new Date();
    await StorageService.updateInStore(this.VOTER_STORE, voter);
  }

  private static async resetLoginAttempts(voter: VoterRecord): Promise<void> {
    voter.loginAttempts = 0;
    voter.biometricAttempts = 0;
    voter.lastLoginAttempt = undefined;
    voter.lastBiometricAttempt = undefined;
    await StorageService.updateInStore(this.VOTER_STORE, voter);
  }

  /**
   * Export voter data for admin analytics
   */
  static async exportVoterData(filters?: {
    state?: string;
    lga?: string;
    status?: 'active' | 'suspended';
    dateRange?: { start: Date; end: Date };
  }): Promise<string> {
    try {
      let voters = await StorageService.getAllFromStore(this.VOTER_STORE) as VoterRecord[];

      // Apply filters
      if (filters) {
        if (filters.state) {
          voters = voters.filter(v => v.state === filters.state);
        }
        if (filters.lga) {
          voters = voters.filter(v => v.lga === filters.lga);
        }
        if (filters.status) {
          voters = voters.filter(v => 
            filters.status === 'active' ? v.isActive : !v.isActive
          );
        }
        if (filters.dateRange) {
          voters = voters.filter(v => 
            v.registrationDate >= filters.dateRange!.start && 
            v.registrationDate <= filters.dateRange!.end
          );
        }
      }

      // Create CSV
      const headers = ['ID', 'First Name', 'Last Name', 'Sex', 'Date of Birth', 'State', 'LGA', 'Ward', 'Polling Unit', 'Registration Date', 'Status', 'Verified'];
      const csvRows = [headers.join(',')];

      voters.forEach(voter => {
        const row = [
          voter.id,
          voter.firstName,
          voter.lastName,
          voter.sex,
          voter.dateOfBirth.toISOString().split('T')[0],
          voter.state,
          voter.lga,
          voter.ward,
          voter.pollingUnit,
          voter.registrationDate.toISOString().split('T')[0],
          voter.isActive ? 'Active' : 'Suspended',
          voter.isVerified ? 'Yes' : 'No'
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('Error exporting voter data:', error);
      return '';
    }
  }
}