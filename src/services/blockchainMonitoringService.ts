import { BlockchainMetrics, BlockchainBlock } from '../types';
import { EnhancedBlockchainService } from './enhancedBlockchainService';
import { TransactionManager } from './transactionManager';
import { StorageService } from './storageService';

export class BlockchainMonitoringService {
  private static readonly METRICS_KEY = 'blockchain_metrics_history';
  private static readonly ALERT_THRESHOLD = {
    blockTimeWarning: 10000,
    blockTimeCritical: 30000,
    pendingTransactionsWarning: 100,
    pendingTransactionsCritical: 500
  };

  static async initialize(): Promise<void> {
    await this.startMetricsCollection();
  }

  private static async startMetricsCollection(): Promise<void> {
    setInterval(async () => {
      await this.collectMetrics();
    }, 30000);
  }

  static async getRealtimeMetrics(): Promise<BlockchainMetrics> {
    const chain = await EnhancedBlockchainService.getBlockchain();
    const transactionStats = await TransactionManager.getTransactionStats();
    const networkStatus = await EnhancedBlockchainService.getNetworkStatus();
    const consensus = await EnhancedBlockchainService.getConsensusState();

    const blockTimes = this.calculateBlockTimes(chain);
    const averageBlockTime = blockTimes.length > 0
      ? blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length
      : 0;

    const tps = this.calculateTPS(chain);
    const hashRate = this.calculateNetworkHashRate(chain, consensus.difficulty);
    const chainValid = await EnhancedBlockchainService.validateBlockchain();

    let consensusHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (networkStatus.networkHealth === 'critical' || !chainValid) {
      consensusHealth = 'critical';
    } else if (networkStatus.networkHealth === 'degraded' || averageBlockTime > this.ALERT_THRESHOLD.blockTimeWarning) {
      consensusHealth = 'degraded';
    }

    const metrics: BlockchainMetrics = {
      totalBlocks: chain.length,
      totalTransactions: transactionStats.totalTransactions,
      averageBlockTime,
      transactionsPerSecond: tps,
      networkHashRate: hashRate,
      activeNodes: networkStatus.activeNodes,
      consensusHealth,
      chainValidity: chainValid,
      lastBlockTime: chain.length > 0 ? chain[chain.length - 1].timestamp : new Date(),
      pendingTransactions: transactionStats.pendingTransactions
    };

    return metrics;
  }

  private static calculateBlockTimes(chain: BlockchainBlock[]): number[] {
    const times: number[] = [];
    
    for (let i = 1; i < Math.min(chain.length, 100); i++) {
      const current = new Date(chain[i].timestamp).getTime();
      const previous = new Date(chain[i - 1].timestamp).getTime();
      times.push(current - previous);
    }
    
    return times;
  }

  private static calculateTPS(chain: BlockchainBlock[]): number {
    const recentBlocks = chain.slice(-10);
    
    if (recentBlocks.length < 2) return 0;

    const totalTransactions = recentBlocks.reduce((sum, block) => {
      return sum + (block.transactions?.length || 0);
    }, 0);

    const firstBlock = recentBlocks[0];
    const lastBlock = recentBlocks[recentBlocks.length - 1];
    const timeSpan = (new Date(lastBlock.timestamp).getTime() - new Date(firstBlock.timestamp).getTime()) / 1000;

    return timeSpan > 0 ? totalTransactions / timeSpan : 0;
  }

  private static calculateNetworkHashRate(chain: BlockchainBlock[], difficulty: number): number {
    const recentBlocks = chain.slice(-100);
    
    if (recentBlocks.length < 2) return 0;

    const hashesPerBlock = Math.pow(2, difficulty * 4);
    const totalHashes = recentBlocks.length * hashesPerBlock;

    const firstBlock = recentBlocks[0];
    const lastBlock = recentBlocks[recentBlocks.length - 1];
    const timeSpan = (new Date(lastBlock.timestamp).getTime() - new Date(firstBlock.timestamp).getTime()) / 1000;

    return timeSpan > 0 ? totalHashes / timeSpan : 0;
  }

  static async getBlockchainHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getRealtimeMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (!metrics.chainValidity) {
      issues.push('Blockchain integrity compromised');
      recommendations.push('Investigate and resolve chain validation errors immediately');
      overall = 'critical';
    }

    if (metrics.consensusHealth === 'critical') {
      issues.push('Consensus mechanism in critical state');
      recommendations.push('Check validator nodes and ensure minimum required validators are active');
      overall = 'critical';
    }

    if (metrics.pendingTransactions > this.ALERT_THRESHOLD.pendingTransactionsCritical) {
      issues.push(`High pending transaction count: ${metrics.pendingTransactions}`);
      recommendations.push('Increase block production rate or batch size');
      if (overall !== 'critical') overall = 'warning';
    }

    if (metrics.averageBlockTime > this.ALERT_THRESHOLD.blockTimeCritical) {
      issues.push(`Block time critically high: ${Math.round(metrics.averageBlockTime)}ms`);
      recommendations.push('Check network connectivity and validator performance');
      overall = 'critical';
    } else if (metrics.averageBlockTime > this.ALERT_THRESHOLD.blockTimeWarning) {
      issues.push(`Block time elevated: ${Math.round(metrics.averageBlockTime)}ms`);
      recommendations.push('Monitor validator performance');
      if (overall === 'healthy') overall = 'warning';
    }

    if (metrics.activeNodes < 3) {
      issues.push('Low node count');
      recommendations.push('Ensure minimum required nodes are online');
      if (overall === 'healthy') overall = 'warning';
    }

    if (issues.length === 0) {
      return {
        overall: 'healthy',
        issues: [],
        recommendations: ['System operating normally']
      };
    }

    return { overall, issues, recommendations };
  }

  static async getHistoricalMetrics(hours: number = 24): Promise<BlockchainMetrics[]> {
    const history = await StorageService.getItem(this.METRICS_KEY) || [];
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return history.filter((m: BlockchainMetrics) => 
      new Date(m.lastBlockTime) > cutoffTime
    );
  }

  static async collectMetrics(): Promise<void> {
    const metrics = await this.getRealtimeMetrics();
    const history = await StorageService.getItem(this.METRICS_KEY) || [];
    
    history.push(metrics);

    const maxHistoryItems = 1000;
    if (history.length > maxHistoryItems) {
      history.shift();
    }

    await StorageService.setItem(this.METRICS_KEY, history);
  }

  static async getBlockStatistics(blockIndex: number): Promise<{
    block: BlockchainBlock;
    validator: string;
    transactionCount: number;
    totalGasUsed: number;
    blockSize: number;
    confirmations: number;
  } | null> {
    const block = await EnhancedBlockchainService.getBlockByIndex(blockIndex);
    
    if (!block) return null;

    const chain = await EnhancedBlockchainService.getBlockchain();
    const confirmations = chain.length - block.index;

    return {
      block,
      validator: block.validator || 'unknown',
      transactionCount: block.transactions?.length || 0,
      totalGasUsed: block.gasUsed || 0,
      blockSize: JSON.stringify(block).length,
      confirmations
    };
  }

  static async getValidatorPerformance(): Promise<Array<{
    validatorId: string;
    address: string;
    blocksValidated: number;
    reputation: number;
    uptime: number;
  }>> {
    const nodes = await EnhancedBlockchainService.getNodes();
    const validators = nodes.filter(n => n.type === 'validator');

    return validators.map(v => ({
      validatorId: v.id,
      address: v.address,
      blocksValidated: v.blocksValidated,
      reputation: v.reputation,
      uptime: v.status === 'active' ? 100 : 0
    }));
  }

  static async getTransactionAnalytics(): Promise<{
    hourlyVolume: number[];
    typeDistribution: Record<string, number>;
    averageConfirmationTime: number;
    successRate: number;
  }> {
    const stats = await TransactionManager.getTransactionStats();
    const chain = await EnhancedBlockchainService.getBlockchain();

    const recentBlocks = chain.slice(-24);
    const hourlyVolume = new Array(24).fill(0);
    
    recentBlocks.forEach((block, index) => {
      const txCount = block.transactions?.length || 0;
      hourlyVolume[index] = txCount;
    });

    const totalTransactions = stats.totalTransactions;
    const successfulTransactions = stats.confirmedTransactions;
    const successRate = totalTransactions > 0 
      ? (successfulTransactions / totalTransactions) * 100 
      : 0;

    return {
      hourlyVolume,
      typeDistribution: stats.transactionsByType,
      averageConfirmationTime: 3000,
      successRate
    };
  }

  static async getNetworkTopology(): Promise<{
    nodes: Array<{
      id: string;
      type: string;
      status: string;
      connections: number;
    }>;
    totalConnections: number;
  }> {
    const nodes = await EnhancedBlockchainService.getNodes();
    
    const nodeInfo = nodes.map(n => ({
      id: n.id,
      type: n.type,
      status: n.status,
      connections: n.type === 'validator' ? nodes.length - 1 : 3
    }));

    const totalConnections = nodeInfo.reduce((sum, n) => sum + n.connections, 0);

    return {
      nodes: nodeInfo,
      totalConnections
    };
  }

  static async detectAnomalies(): Promise<Array<{
    type: 'performance' | 'security' | 'consensus';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }>> {
    const anomalies: Array<{
      type: 'performance' | 'security' | 'consensus';
      severity: 'low' | 'medium' | 'high';
      message: string;
      timestamp: Date;
    }> = [];

    const metrics = await this.getRealtimeMetrics();

    if (!metrics.chainValidity) {
      anomalies.push({
        type: 'security',
        severity: 'high',
        message: 'Blockchain integrity check failed',
        timestamp: new Date()
      });
    }

    if (metrics.consensusHealth === 'critical') {
      anomalies.push({
        type: 'consensus',
        severity: 'high',
        message: 'Consensus mechanism in critical state',
        timestamp: new Date()
      });
    }

    if (metrics.pendingTransactions > this.ALERT_THRESHOLD.pendingTransactionsCritical) {
      anomalies.push({
        type: 'performance',
        severity: 'high',
        message: `Pending transaction backlog: ${metrics.pendingTransactions}`,
        timestamp: new Date()
      });
    }

    if (metrics.averageBlockTime > this.ALERT_THRESHOLD.blockTimeCritical) {
      anomalies.push({
        type: 'performance',
        severity: 'medium',
        message: `Block time exceeds threshold: ${Math.round(metrics.averageBlockTime)}ms`,
        timestamp: new Date()
      });
    }

    return anomalies;
  }
}
