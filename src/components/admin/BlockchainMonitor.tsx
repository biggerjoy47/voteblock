import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, Database, Network, TrendingUp, Zap } from 'lucide-react';
import { BlockchainMonitoringService } from '../../services/blockchainMonitoringService';
import { EnhancedBlockchainService } from '../../services/enhancedBlockchainService';
import { SmartContractService } from '../../services/smartContractService';
import { BlockchainMetrics } from '../../types';

interface BlockchainMonitorProps {
  onNavigate: (view: string) => void;
}

export function BlockchainMonitor({ }: BlockchainMonitorProps) {
  const [metrics, setMetrics] = useState<BlockchainMetrics | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [validators, setValidators] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [contractMetrics, setContractMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [metricsData, healthData, validatorData, anomalyData, networkData, contractData] = await Promise.all([
        BlockchainMonitoringService.getRealtimeMetrics(),
        BlockchainMonitoringService.getBlockchainHealth(),
        BlockchainMonitoringService.getValidatorPerformance(),
        BlockchainMonitoringService.detectAnomalies(),
        EnhancedBlockchainService.getNetworkStatus(),
        SmartContractService.getContractMetrics()
      ]);

      setMetrics(metricsData);
      setHealth(healthData);
      setValidators(validatorData);
      setAnomalies(anomalyData);
      setNetworkStatus(networkData);
      setContractMetrics(contractData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading blockchain monitor data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Blockchain Network Monitor</h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {health && health.overall !== 'healthy' && (
        <div className={`p-4 rounded-lg border ${health.overall === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${health.overall === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
            <div className="flex-1">
              <h3 className={`font-semibold ${health.overall === 'critical' ? 'text-red-900' : 'text-yellow-900'}`}>
                {health.overall === 'critical' ? 'Critical Issues Detected' : 'Warnings'}
              </h3>
              <ul className="mt-2 space-y-1">
                {health.issues.map((issue: string, idx: number) => (
                  <li key={idx} className="text-sm">{issue}</li>
                ))}
              </ul>
              {health.recommendations.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium">Recommendations:</p>
                  <ul className="mt-1 space-y-1">
                    {health.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200" data-testid="card-total-blocks">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Blocks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.totalBlocks || 0}</p>
            </div>
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <div className={`mt-3 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getHealthColor(metrics?.consensusHealth || 'healthy')}`}>
            {metrics?.chainValidity ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            {metrics?.chainValidity ? 'Chain Valid' : 'Chain Invalid'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200" data-testid="card-total-transactions">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.totalTransactions || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {metrics?.pendingTransactions || 0} pending
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200" data-testid="card-tps">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">TPS</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics?.transactionsPerSecond.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Avg block time: {metrics?.averageBlockTime ? Math.round(metrics.averageBlockTime) : 0}ms
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200" data-testid="card-active-nodes">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Nodes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.activeNodes || 0}</p>
            </div>
            <Network className="h-8 w-8 text-indigo-600" />
          </div>
          <div className={`mt-3 inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getHealthColor(networkStatus?.networkHealth || 'healthy')}`}>
            {networkStatus?.networkHealth || 'Unknown'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-yellow-600" />
            Validator Performance
          </h3>
          <div className="space-y-3">
            {validators.length > 0 ? (
              validators.map((validator, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3" data-testid={`validator-${idx}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{validator.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Blocks: {validator.blocksValidated} | Reputation: {validator.reputation}%
                      </p>
                    </div>
                    <div className="flex items-center">
                      <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-gray-600">Active</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No validators found</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
            Smart Contracts
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Contracts</span>
              <span className="font-semibold text-gray-900">{contractMetrics?.totalContracts || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Contracts</span>
              <span className="font-semibold text-gray-900">{contractMetrics?.activeContracts || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Executions</span>
              <span className="font-semibold text-gray-900">{contractMetrics?.totalExecutions || 0}</span>
            </div>
            {contractMetrics?.contractsByType && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">By Type:</p>
                {Object.entries(contractMetrics.contractsByType).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Recent Anomalies
          </h3>
          <div className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className={`p-3 rounded border ${
                anomaly.severity === 'high' ? 'bg-red-50 border-red-200' :
                anomaly.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                'bg-blue-50 border-blue-200'
              }`} data-testid={`anomaly-${idx}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-xs font-medium uppercase ${
                      anomaly.severity === 'high' ? 'text-red-700' :
                      anomaly.severity === 'medium' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                      {anomaly.type} • {anomaly.severity}
                    </span>
                    <p className="text-sm text-gray-900 mt-1">{anomaly.message}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(anomaly.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600">Hash Rate</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {metrics?.networkHashRate ? metrics.networkHashRate.toFixed(0) : '0'} H/s
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Consensus</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {metrics?.consensusHealth || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Last Block</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {metrics?.lastBlockTime ? new Date(metrics.lastBlockTime).toLocaleTimeString() : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Chain Status</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {metrics?.chainValidity ? '✓ Valid' : '✗ Invalid'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
