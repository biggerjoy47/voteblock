import { SystemConfig } from '../types';
import { StorageService } from './storageService';
import { CryptoService } from './cryptoService';
import { AuditService } from './auditService';

export class ConfigService {
  private static readonly CONFIG_KEY = 'system_config';
  private static config: SystemConfig | null = null;

  /**
   * Initialize system configuration with defaults
   */
  static async initialize(): Promise<void> {
    try {
      const existingConfig = await StorageService.getItem(this.CONFIG_KEY);
      if (!existingConfig) {
        await this.createDefaultConfig();
      } else {
        this.config = existingConfig;
      }
    } catch (error) {
      console.error('Error initializing config service:', error);
      await this.createDefaultConfig();
    }
  }

  /**
   * Create default system configuration
   */
  private static async createDefaultConfig(): Promise<void> {
    const defaultConfig: SystemConfig = {
      id: crypto.randomUUID(),
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotationDays: 90,
        lastRotation: new Date()
      },
      blockchain: {
        networkId: 'nigeria-evoting-network',
        peerNodes: ['peer0.inec.gov.ng', 'peer1.inec.gov.ng', 'peer2.inec.gov.ng'],
        channelName: 'evoting-channel',
        consensusType: 'raft'
      },
      authentication: {
        passwordPolicy: {
          minLength: 12,
          requireSpecialChars: true,
          requireNumbers: true,
          maxAge: 90
        },
        twoFactorEnabled: false,
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15
      },
      biometric: {
        confidenceThreshold: 0.8,
        livenessThreshold: 0.6,
        requireLiveness: true,
        antiSpoofingEnabled: true
      },
      election: {
        maxVotersPerElection: 10000,
        allowConcurrentElections: true,
        voteReceiptFormat: 'both'
      },
      audit: {
        retentionDays: 2555, // 7 years
        hashChainEnabled: true,
        exportFormat: 'csv'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await StorageService.setItem(this.CONFIG_KEY, defaultConfig);
    this.config = defaultConfig;
  }

  /**
   * Get current system configuration
   */
  static async getConfig(): Promise<SystemConfig> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config!;
  }

  /**
   * Update system configuration
   */
  static async updateConfig(updates: Partial<SystemConfig>, userId: string): Promise<SystemConfig> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig: SystemConfig = {
        ...currentConfig,
        ...updates,
        updatedAt: new Date()
      };

      await StorageService.setItem(this.CONFIG_KEY, updatedConfig);
      this.config = updatedConfig;

      // Log configuration change
      await AuditService.logEvent(
        userId,
        AuditService.ACTIONS.SYSTEM_CONFIG_UPDATED,
        `System configuration updated: ${Object.keys(updates).join(', ')}`,
        'success',
        { updates }
      );

      return updatedConfig;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  /**
   * Validate password against policy
   */
  static async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.getConfig();
    const policy = config.authentication.passwordPolicy;
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if user is locked out
   */
  static async isUserLockedOut(userId: string): Promise<boolean> {
    const config = await this.getConfig();
    const maxAttempts = config.authentication.maxLoginAttempts;
    const lockoutDuration = config.authentication.lockoutDurationMinutes;

    // Get recent failed login attempts
    const recentLogs = await AuditService.getAuditLogs({
      userId,
      action: AuditService.ACTIONS.LOGIN_FAILURE,
      startDate: new Date(Date.now() - lockoutDuration * 60 * 1000)
    });

    return recentLogs.length >= maxAttempts;
  }

  /**
   * Export configuration (excluding sensitive data)
   */
  static async exportConfig(): Promise<string> {
    const config = await this.getConfig();
    const exportData = {
      ...config,
      // Remove sensitive information
      encryption: {
        algorithm: config.encryption.algorithm,
        keyRotationDays: config.encryption.keyRotationDays
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration with validation
   */
  static async importConfig(configData: string, userId: string): Promise<void> {
    try {
      const importedConfig = JSON.parse(configData);
      
      // Validate required fields
      const requiredFields = ['authentication', 'biometric', 'election', 'audit'];
      for (const field of requiredFields) {
        if (!importedConfig[field]) {
          throw new Error(`Missing required configuration section: ${field}`);
        }
      }

      // Merge with current config to preserve sensitive data
      const currentConfig = await this.getConfig();
      const mergedConfig: SystemConfig = {
        ...currentConfig,
        ...importedConfig,
        id: currentConfig.id, // Preserve original ID
        encryption: currentConfig.encryption, // Preserve encryption settings
        updatedAt: new Date()
      };

      await this.updateConfig(mergedConfig, userId);
    } catch (error) {
      console.error('Error importing config:', error);
      throw new Error('Invalid configuration format');
    }
  }

  /**
   * Reset configuration to defaults
   */
  static async resetToDefaults(userId: string): Promise<void> {
    await StorageService.setItem(this.CONFIG_KEY, null);
    this.config = null;
    await this.initialize();

    await AuditService.logEvent(
      userId,
      AuditService.ACTIONS.SYSTEM_CONFIG_UPDATED,
      'System configuration reset to defaults',
      'success'
    );
  }

  /**
   * Get blockchain health status
   */
  static async getBlockchainHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    nodeCount: number;
    lastSync: Date | null;
    consensusHealth: boolean;
  }> {
    // Simulate blockchain health check
    // In a real implementation, this would check actual Hyperledger Fabric network
    const config = await this.getConfig();
    const nodeCount = config.blockchain.peerNodes.length;
    
    // Simulate network status
    const isOnline = navigator.onLine;
    const consensusHealth = Math.random() > 0.1; // 90% healthy
    
    let status: 'healthy' | 'degraded' | 'offline' = 'healthy';
    if (!isOnline) {
      status = 'offline';
    } else if (!consensusHealth || nodeCount < 2) {
      status = 'degraded';
    }

    return {
      status,
      nodeCount,
      lastSync: isOnline ? new Date() : null,
      consensusHealth
    };
  }
}