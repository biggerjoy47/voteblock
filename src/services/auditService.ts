import { AuditLog } from '../types';
import { StorageService } from './storageService';
import { CryptoService } from './cryptoService';

export class AuditService {
  private static readonly AUDIT_CHAIN_KEY = 'audit_chain';
  private static lastHash: string = '0';

  /**
   * Initialize audit service with genesis entry
   */
  static async initialize(): Promise<void> {
    try {
      const existingChain = await StorageService.getItem(this.AUDIT_CHAIN_KEY);
      if (!existingChain) {
        const genesisLog: AuditLog = {
          id: crypto.randomUUID(),
          userId: 'system',
          action: 'audit_chain_initialized',
          details: 'Audit chain genesis block created',
          result: 'success',
          timestamp: new Date(),
          previousHash: '0',
          hash: ''
        };
        
        genesisLog.hash = await this.calculateLogHash(genesisLog);
        this.lastHash = genesisLog.hash;
        
        await StorageService.setItem(this.AUDIT_CHAIN_KEY, [genesisLog]);
      } else {
        // Set last hash from existing chain
        const chain = existingChain as AuditLog[];
        if (chain.length > 0) {
          this.lastHash = chain[chain.length - 1].hash || '0';
        }
      }
    } catch (error) {
      console.error('Error initializing audit service:', error);
    }
  }

  /**
   * Log an audit event with hash chaining
   */
  static async logEvent(
    userId: string,
    action: string,
    details: string,
    result: 'success' | 'failure' | 'pending' = 'success',
    metadata?: any,
    voterNin?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: crypto.randomUUID(),
        userId,
        voterNin,
        action,
        details,
        result,
        metadata,
        timestamp: new Date(),
        sessionId,
        previousHash: this.lastHash,
        hash: ''
      };

      // Calculate hash for this entry
      auditLog.hash = await this.calculateLogHash(auditLog);
      this.lastHash = auditLog.hash;

      // Add to chain
      const chain = await StorageService.getItem(this.AUDIT_CHAIN_KEY) || [];
      chain.push(auditLog);
      
      await StorageService.setItem(this.AUDIT_CHAIN_KEY, chain);
      await StorageService.addToStore('auditLogs', auditLog);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Calculate hash for audit log entry
   */
  private static async calculateLogHash(log: AuditLog): Promise<string> {
    const hashData = `${log.id}${log.userId}${log.action}${log.details}${log.result}${log.timestamp.toISOString()}${log.previousHash}`;
    return await CryptoService.generateHash(hashData);
  }

  /**
   * Verify audit chain integrity
   */
  static async verifyChainIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const chain = await StorageService.getItem(this.AUDIT_CHAIN_KEY) || [];
      const errors: string[] = [];

      for (let i = 0; i < chain.length; i++) {
        const currentLog = chain[i];
        
        // Verify hash
        const calculatedHash = await this.calculateLogHash(currentLog);
        if (currentLog.hash !== calculatedHash) {
          errors.push(`Hash mismatch at index ${i}: expected ${calculatedHash}, got ${currentLog.hash}`);
        }

        // Verify chain linkage (except for genesis)
        if (i > 0) {
          const previousLog = chain[i - 1];
          if (currentLog.previousHash !== previousLog.hash) {
            errors.push(`Chain break at index ${i}: previous hash mismatch`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      console.error('Error verifying audit chain:', error);
      return { valid: false, errors: ['Failed to verify audit chain'] };
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters?: {
    userId?: string;
    voterNin?: string;
    action?: string;
    result?: 'success' | 'failure' | 'pending';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      let logs = await StorageService.getAllFromStore('auditLogs') as AuditLog[];

      if (filters) {
        if (filters.userId) {
          logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.voterNin) {
          logs = logs.filter(log => log.voterNin === filters.voterNin);
        }
        if (filters.action) {
          logs = logs.filter(log => log.action.includes(filters.action));
        }
        if (filters.result) {
          logs = logs.filter(log => log.result === filters.result);
        }
        if (filters.startDate) {
          logs = logs.filter(log => new Date(log.timestamp) >= filters.startDate!);
        }
        if (filters.endDate) {
          logs = logs.filter(log => new Date(log.timestamp) <= filters.endDate!);
        }
        if (filters.limit) {
          logs = logs.slice(0, filters.limit);
        }
      }

      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Export audit logs to CSV
   */
  static async exportToCSV(filters?: any): Promise<string> {
    const logs = await this.getAuditLogs(filters);
    
    const headers = ['Timestamp', 'User ID', 'Voter NIN', 'Action', 'Details', 'Result', 'Session ID'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.timestamp.toISOString(),
        log.userId,
        log.voterNin || '',
        log.action,
        `"${log.details.replace(/"/g, '""')}"`, // Escape quotes
        log.result,
        log.sessionId || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    uniqueVoters: number;
    chainIntegrity: boolean;
    lastEvent: Date | null;
  }> {
    try {
      const logs = await StorageService.getAllFromStore('auditLogs') as AuditLog[];
      const uniqueUsers = new Set(logs.map(log => log.userId)).size;
      const uniqueVoters = new Set(logs.filter(log => log.voterNin).map(log => log.voterNin)).size;
      const successfulEvents = logs.filter(log => log.result === 'success').length;
      const failedEvents = logs.filter(log => log.result === 'failure').length;
      const lastEvent = logs.length > 0 ? new Date(Math.max(...logs.map(log => new Date(log.timestamp).getTime()))) : null;
      
      const { valid: chainIntegrity } = await this.verifyChainIntegrity();

      return {
        totalEvents: logs.length,
        successfulEvents,
        failedEvents,
        uniqueUsers,
        uniqueVoters,
        chainIntegrity,
        lastEvent
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        uniqueUsers: 0,
        uniqueVoters: 0,
        chainIntegrity: false,
        lastEvent: null
      };
    }
  }

  // Predefined audit actions for consistency
  static readonly ACTIONS = {
    // Authentication
    LOGIN_ATTEMPT: 'login_attempt',
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    SESSION_TIMEOUT: 'session_timeout',
    
    // Voter actions
    VOTER_REGISTRATION: 'voter_registration',
    VOTER_LOGIN_ATTEMPT: 'voter_login_attempt',
    VOTER_NIN_VALIDATION: 'voter_nin_validation',
    BIOMETRIC_CAPTURE: 'biometric_capture',
    BIOMETRIC_VERIFICATION: 'biometric_verification',
    LIVENESS_CHECK: 'liveness_check',
    
    // Voting
    VOTE_CAST: 'vote_cast',
    VOTE_SYNC: 'vote_sync',
    RECEIPT_GENERATED: 'receipt_generated',
    RECEIPT_VERIFIED: 'receipt_verified',
    
    // Election management
    ELECTION_CREATED: 'election_created',
    ELECTION_UPDATED: 'election_updated',
    ELECTION_ACTIVATED: 'election_activated',
    ELECTION_CLOSED: 'election_closed',
    CANDIDATE_ADDED: 'candidate_added',
    CANDIDATE_UPDATED: 'candidate_updated',
    
    // System
    SYSTEM_CONFIG_UPDATED: 'system_config_updated',
    BLOCKCHAIN_SYNC: 'blockchain_sync',
    DATA_EXPORT: 'data_export',
    AUDIT_CHAIN_VERIFIED: 'audit_chain_verified'
  };
}