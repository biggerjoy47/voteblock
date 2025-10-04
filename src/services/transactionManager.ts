import { BlockchainTransaction } from '../types';
import { StorageService } from './storageService';
import { CryptoService } from './cryptoService';

export class TransactionManager {
  private static readonly TRANSACTION_POOL_KEY = 'transaction_pool';
  private static readonly MAX_POOL_SIZE = 1000;
  private static readonly BATCH_SIZE = 10;

  static async initialize(): Promise<void> {
    const pool = await StorageService.getItem(this.TRANSACTION_POOL_KEY);
    if (!pool) {
      await StorageService.setItem(this.TRANSACTION_POOL_KEY, []);
    }
  }

  static async createTransaction(
    type: BlockchainTransaction['type'],
    from: string,
    data: any,
    to?: string
  ): Promise<BlockchainTransaction> {
    const transaction: BlockchainTransaction = {
      id: crypto.randomUUID(),
      type,
      from,
      to,
      data,
      timestamp: new Date(),
      signature: '',
      status: 'pending',
      gasLimit: this.calculateGasLimit(type),
      gasUsed: 0
    };

    transaction.signature = await this.signTransaction(transaction);

    return transaction;
  }

  static async submitTransaction(transaction: BlockchainTransaction): Promise<void> {
    const validationResult = await this.validateTransaction(transaction);
    
    if (!validationResult.valid) {
      throw new Error(`Transaction validation failed: ${validationResult.reason}`);
    }

    const pool = await this.getTransactionPool();
    
    if (pool.length >= this.MAX_POOL_SIZE) {
      throw new Error('Transaction pool is full');
    }

    pool.push(transaction);
    await StorageService.setItem(this.TRANSACTION_POOL_KEY, pool);
  }

  static async validateTransaction(transaction: BlockchainTransaction): Promise<{ valid: boolean; reason?: string }> {
    if (!transaction.id || !transaction.signature) {
      return { valid: false, reason: 'Missing transaction ID or signature' };
    }

    if (!transaction.from) {
      return { valid: false, reason: 'Missing sender address' };
    }

    if (!transaction.data) {
      return { valid: false, reason: 'Missing transaction data' };
    }

    const validTypes: BlockchainTransaction['type'][] = ['vote', 'election_create', 'election_update', 'voter_register', 'smart_contract'];
    if (!validTypes.includes(transaction.type)) {
      return { valid: false, reason: 'Invalid transaction type' };
    }

    return { valid: true };
  }

  private static async signTransaction(transaction: BlockchainTransaction): Promise<string> {
    const transactionData = JSON.stringify({
      id: transaction.id,
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      data: transaction.data,
      timestamp: transaction.timestamp
    });

    return await CryptoService.generateHash(transactionData);
  }

  static async getTransactionPool(): Promise<BlockchainTransaction[]> {
    const pool = await StorageService.getItem(this.TRANSACTION_POOL_KEY);
    return pool || [];
  }

  static async getPendingTransactions(limit?: number): Promise<BlockchainTransaction[]> {
    const pool = await this.getTransactionPool();
    const pending = pool.filter(tx => tx.status === 'pending');
    
    if (limit) {
      return pending.slice(0, limit);
    }
    
    return pending;
  }

  static async getTransactionsByType(type: BlockchainTransaction['type']): Promise<BlockchainTransaction[]> {
    const pool = await this.getTransactionPool();
    return pool.filter(tx => tx.type === type);
  }

  static async getTransactionById(id: string): Promise<BlockchainTransaction | null> {
    const pool = await this.getTransactionPool();
    return pool.find(tx => tx.id === id) || null;
  }

  static async getBatchForProcessing(): Promise<BlockchainTransaction[]> {
    const pending = await this.getPendingTransactions();
    
    pending.sort((a, b) => {
      const priorityOrder = { vote: 1, smart_contract: 2, election_update: 3, election_create: 4, voter_register: 5 };
      const aPriority = priorityOrder[a.type] || 999;
      const bPriority = priorityOrder[b.type] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    return pending.slice(0, this.BATCH_SIZE);
  }

  static async markTransactionConfirmed(transactionId: string, blockIndex: number, gasUsed: number): Promise<void> {
    const pool = await this.getTransactionPool();
    const transaction = pool.find(tx => tx.id === transactionId);
    
    if (transaction) {
      transaction.status = 'confirmed';
      transaction.blockIndex = blockIndex;
      transaction.gasUsed = gasUsed;
      await StorageService.setItem(this.TRANSACTION_POOL_KEY, pool);
    }
  }

  static async markTransactionFailed(transactionId: string): Promise<void> {
    const pool = await this.getTransactionPool();
    const transaction = pool.find(tx => tx.id === transactionId);
    
    if (transaction) {
      transaction.status = 'failed';
      await StorageService.setItem(this.TRANSACTION_POOL_KEY, pool);
    }
  }

  static async removePendingTransaction(transactionId: string): Promise<void> {
    const pool = await this.getTransactionPool();
    const updatedPool = pool.filter(tx => tx.id !== transactionId);
    await StorageService.setItem(this.TRANSACTION_POOL_KEY, updatedPool);
  }

  static async clearConfirmedTransactions(olderThan?: Date): Promise<number> {
    const pool = await this.getTransactionPool();
    const cutoffTime = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago
    
    const filteredPool = pool.filter(tx => {
      if (tx.status !== 'confirmed') return true;
      return tx.timestamp > cutoffTime;
    });

    const removedCount = pool.length - filteredPool.length;
    await StorageService.setItem(this.TRANSACTION_POOL_KEY, filteredPool);
    
    return removedCount;
  }

  private static calculateGasLimit(type: BlockchainTransaction['type']): number {
    const gasLimits = {
      vote: 100,
      election_create: 500,
      election_update: 300,
      voter_register: 200,
      smart_contract: 1000
    };

    return gasLimits[type] || 100;
  }

  static async getTransactionStats(): Promise<{
    totalTransactions: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    transactionsByType: Record<string, number>;
    averageGasUsed: number;
  }> {
    const pool = await this.getTransactionPool();
    
    const transactionsByType: Record<string, number> = {};
    let totalGasUsed = 0;
    let confirmedCount = 0;

    pool.forEach(tx => {
      transactionsByType[tx.type] = (transactionsByType[tx.type] || 0) + 1;
      if (tx.status === 'confirmed' && tx.gasUsed) {
        totalGasUsed += tx.gasUsed;
        confirmedCount++;
      }
    });

    return {
      totalTransactions: pool.length,
      pendingTransactions: pool.filter(tx => tx.status === 'pending').length,
      confirmedTransactions: pool.filter(tx => tx.status === 'confirmed').length,
      failedTransactions: pool.filter(tx => tx.status === 'failed').length,
      transactionsByType,
      averageGasUsed: confirmedCount > 0 ? totalGasUsed / confirmedCount : 0
    };
  }

  static async verifyTransactionSignature(transaction: BlockchainTransaction): Promise<boolean> {
    const expectedSignature = await this.signTransaction(transaction);
    return transaction.signature === expectedSignature;
  }
}
