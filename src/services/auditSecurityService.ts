import { AuditEvent } from '../types/voter';
import { SecureStorageService } from './secureStorageService';
import { CryptoSecurityService } from './cryptoSecurityService';

export class AuditSecurityService {
  private static readonly AUDIT_CHAIN_KEY = 'secure_audit_chain';
  private static lastHash: string = '0';

  /**
   * Initialize secure audit service with genesis entry
   */
  static async initialize(): Promise<void> {
    try {
      const existingChain = await SecureStorageService.getItem(this.AUDIT_CHAIN_KEY);
      if (!existingChain) {
        const genesisLog: AuditEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: 'login_attempt',
          result: 'success',
          details: 'Secure audit chain genesis block created',
          sessionId: CryptoSecurityService.generateSessionId(),
          previousHash: '0',
          currentHash: ''
        };
        
        genesisLog.currentHash = await this.calculateLogHash(genesisLog);
        this.lastHash = genesisLog.currentHash;
        
        await SecureStorageService.setItem(this.AUDIT_CHAIN_KEY, [genesisLog]);
      } else {
        // Set last hash from existing chain
        const chain = existingChain as AuditEvent[];
        if (chain.length > 0) {
          this.lastHash = chain[chain.length - 1].currentHash || '0';
        }
      }
    } catch (error) {
      console.error('Error initializing secure audit service:', error);
    }
  }

  /**
   * Log secure audit event with hash chaining
   */
  static async logEvent(eventData: {
    eventType: AuditEvent['eventType'];
    userId?: string;
    voterNin?: string;
    result: AuditEvent['result'];
    details: string;
    sessionId: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const auditLog: AuditEvent = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType: eventData.eventType,
        userId: eventData.userId,
        voterNin: eventData.voterNin ? await CryptoSecurityService.hashNIN(eventData.voterNin) : undefined,
        result: eventData.result,
        details: eventData.details,
        metadata: eventData.metadata,
        ipAddress: eventData.ipAddress || 'localhost',
        userAgent: eventData.userAgent || navigator.userAgent,
        sessionId: eventData.sessionId,
        previousHash: this.lastHash,
        currentHash: ''
      };

      // Calculate hash for this entry
      auditLog.currentHash = await this.calculateLogHash(auditLog);
      this.lastHash = auditLog.currentHash;

      // Add to chain
      const chain = await SecureStorageService.getItem(this.AUDIT_CHAIN_KEY) || [];
      chain.push(auditLog);
      
      await SecureStorageService.setItem(this.AUDIT_CHAIN_KEY, chain);
      await SecureStorageService.addToStore('auditLogs', auditLog);
    } catch (error) {
      console.error('Error logging secure audit event:', error);
    }
  }

  /**
   * Calculate tamper-evident hash for audit log entry
   */
  private static async calculateLogHash(log: AuditEvent): Promise<string> {
    const hashData = `${log.id}${log.timestamp.toISOString()}${log.eventType}${log.result}${log.details}${log.sessionId}${log.previousHash}`;
    return await CryptoSecurityService.generateHash(hashData);
  }

  /**
   * Verify audit chain integrity with enhanced security
   */
  static async verifyChainIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const chain = await SecureStorageService.getItem(this.AUDIT_CHAIN_KEY) || [];
      const errors: string[] = [];

      for (let i = 0; i < chain.length; i++) {
        const currentLog = chain[i];
        
        // Verify hash
        const calculatedHash = await this.calculateLogHash(currentLog);
        if (currentLog.currentHash !== calculatedHash) {
          errors.push(`Hash mismatch at index ${i}: expected ${calculatedHash}, got ${currentLog.currentHash}`);
        }

        // Verify chain linkage (except for genesis)
        if (i > 0) {
          const previousLog = chain[i - 1];
          if (currentLog.previousHash !== previousLog.currentHash) {
            errors.push(`Chain break at index ${i}: previous hash mismatch`);
          }
        }

        // Verify timestamp sequence
        if (i > 0) {
          const previousLog = chain[i - 1];
          if (new Date(currentLog.timestamp) < new Date(previousLog.timestamp)) {
            errors.push(`Timestamp anomaly at index ${i}: current timestamp is before previous`);
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
   * Get audit logs with enhanced filtering and privacy protection
   */
  static async getAuditLogs(filters?: {
    userId?: string;
    eventType?: AuditEvent['eventType'];
    result?: AuditEvent['result'];
    startDate?: Date;
    endDate?: Date;
    sessionId?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    try {
      let logs = await SecureStorageService.getAllFromStore('auditLogs') as AuditEvent[];

      if (filters) {
        if (filters.userId) {
          logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.eventType) {
          logs = logs.filter(log => log.eventType === filters.eventType);
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
        if (filters.sessionId) {
          logs = logs.filter(log => log.sessionId === filters.sessionId);
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
   * Export audit logs with privacy protection
   */
  static async exportToCSV(filters?: any): Promise<string> {
    const logs = await this.getAuditLogs(filters);
    
    const headers = ['Timestamp', 'Event Type', 'User ID', 'Result', 'Details', 'Session ID'];
    const csvRows = [headers.join(',')];

    logs.forEach(log => {
      const row = [
        log.timestamp.toISOString(),
        log.eventType,
        log.userId || '',
        log.result,
        `"${log.details.replace(/"/g, '""')}"`, // Escape quotes
        log.sessionId
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get comprehensive audit statistics
   */
  static async getAuditStats(): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueSessions: number;
    chainIntegrity: boolean;
    lastEvent: Date | null;
    eventTypeBreakdown: { [key: string]: number };
  }> {
    try {
      const logs = await SecureStorageService.getAllFromStore('auditLogs') as AuditEvent[];
      const uniqueSessions = new Set(logs.map(log => log.sessionId)).size;
      const successfulEvents = logs.filter(log => log.result === 'success').length;
      const failedEvents = logs.filter(log => log.result === 'failure').length;
      const lastEvent = logs.length > 0 ? new Date(Math.max(...logs.map(log => new Date(log.timestamp).getTime()))) : null;
      
      // Event type breakdown
      const eventTypeBreakdown: { [key: string]: number } = {};
      logs.forEach(log => {
        eventTypeBreakdown[log.eventType] = (eventTypeBreakdown[log.eventType] || 0) + 1;
      });
      
      const { valid: chainIntegrity } = await this.verifyChainIntegrity();

      return {
        totalEvents: logs.length,
        successfulEvents,
        failedEvents,
        uniqueSessions,
        chainIntegrity,
        lastEvent,
        eventTypeBreakdown
      };
    } catch (error) {
      console.error('Error getting audit stats:', error);
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        uniqueSessions: 0,
        chainIntegrity: false,
        lastEvent: null,
        eventTypeBreakdown: {}
      };
    }
  }
}