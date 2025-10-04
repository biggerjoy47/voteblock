import React, { useState, useEffect } from 'react';
import { Settings, Shield, Database, Key, Users, Download, Upload, RotateCcw, Save } from 'lucide-react';
import { SystemConfig } from '../../types';
import { ConfigService } from '../../services/configService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface SystemSettingsProps {
  onNavigate: (view: string) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'security' | 'blockchain' | 'biometric' | 'election' | 'audit'>('security');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blockchainHealth, setBlockchainHealth] = useState<any>(null);

  useEffect(() => {
    loadConfig();
    loadBlockchainHealth();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const systemConfig = await ConfigService.getConfig();
      setConfig(systemConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlockchainHealth = async () => {
    try {
      const health = await ConfigService.getBlockchainHealth();
      setBlockchainHealth(health);
    } catch (error) {
      console.error('Error loading blockchain health:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config || !user) return;

    try {
      setIsSaving(true);
      await ConfigService.updateConfig(config, user.id);
      alert('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportConfig = async () => {
    if (!user) return;

    try {
      const exportData = await ConfigService.exportConfig();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_config_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await AuditService.logEvent(
        user.id,
        AuditService.ACTIONS.DATA_EXPORT,
        'System configuration exported',
        'success'
      );
    } catch (error) {
      console.error('Error exporting config:', error);
      alert('Error exporting configuration. Please try again.');
    }
  };

  const handleImportConfig = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const text = await file.text();
      await ConfigService.importConfig(text, user.id);
      await loadConfig();
      alert('Configuration imported successfully');
    } catch (error) {
      console.error('Error importing config:', error);
      alert('Error importing configuration. Please check the file format.');
    }
  };

  const handleResetConfig = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      return;
    }

    try {
      setIsLoading(true);
      await ConfigService.resetToDefaults(user.id);
      await loadConfig();
      alert('Configuration reset to defaults');
    } catch (error) {
      console.error('Error resetting config:', error);
      alert('Error resetting configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = (updates: Partial<SystemConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates });
    }
  };

  const tabs = [
    { id: 'security', label: 'Security & Authentication', icon: Shield },
    { id: 'blockchain', label: 'Blockchain Network', icon: Database },
    { id: 'biometric', label: 'Biometric Settings', icon: Key },
    { id: 'election', label: 'Election Parameters', icon: Users },
    { id: 'audit', label: 'Audit & Logging', icon: Settings }
  ];

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure system parameters and security settings</p>
        </div>
        <div className="flex space-x-3">
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportConfig}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={handleResetConfig}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Security & Authentication Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Password Policy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Length
                    </label>
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={config.authentication.passwordPolicy.minLength}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          passwordPolicy: {
                            ...config.authentication.passwordPolicy,
                            minLength: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Max Age (days)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="365"
                      value={config.authentication.passwordPolicy.maxAge}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          passwordPolicy: {
                            ...config.authentication.passwordPolicy,
                            maxAge: parseInt(e.target.value)
                          }
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="mt-4 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.authentication.passwordPolicy.requireSpecialChars}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          passwordPolicy: {
                            ...config.authentication.passwordPolicy,
                            requireSpecialChars: e.target.checked
                          }
                        }
                      })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require special characters</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.authentication.passwordPolicy.requireNumbers}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          passwordPolicy: {
                            ...config.authentication.passwordPolicy,
                            requireNumbers: e.target.checked
                          }
                        }
                      })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Require numbers</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Session Management</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={config.authentication.sessionTimeoutMinutes}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          sessionTimeoutMinutes: parseInt(e.target.value)
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={config.authentication.maxLoginAttempts}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          maxLoginAttempts: parseInt(e.target.value)
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lockout Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={config.authentication.lockoutDurationMinutes}
                      onChange={(e) => updateConfig({
                        authentication: {
                          ...config.authentication,
                          lockoutDurationMinutes: parseInt(e.target.value)
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.authentication.twoFactorEnabled}
                    onChange={(e) => updateConfig({
                      authentication: {
                        ...config.authentication,
                        twoFactorEnabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
                </label>
              </div>
            </div>
          )}

          {/* Blockchain Tab */}
          {activeTab === 'blockchain' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Network Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Network ID
                    </label>
                    <input
                      type="text"
                      value={config.blockchain.networkId}
                      onChange={(e) => updateConfig({
                        blockchain: {
                          ...config.blockchain,
                          networkId: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Channel Name
                    </label>
                    <input
                      type="text"
                      value={config.blockchain.channelName}
                      onChange={(e) => updateConfig({
                        blockchain: {
                          ...config.blockchain,
                          channelName: e.target.value
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consensus Type
                </label>
                <select
                  value={config.blockchain.consensusType}
                  onChange={(e) => updateConfig({
                    blockchain: {
                      ...config.blockchain,
                      consensusType: e.target.value as 'raft' | 'pbft'
                    }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="raft">RAFT</option>
                  <option value="pbft">PBFT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peer Nodes
                </label>
                <textarea
                  value={config.blockchain.peerNodes.join('\n')}
                  onChange={(e) => updateConfig({
                    blockchain: {
                      ...config.blockchain,
                      peerNodes: e.target.value.split('\n').filter(node => node.trim())
                    }
                  })}
                  className="w-full h-32 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="peer0.inec.gov.ng&#10;peer1.inec.gov.ng&#10;peer2.inec.gov.ng"
                />
                <p className="text-sm text-gray-600 mt-1">Enter one peer node per line</p>
              </div>

              {/* Blockchain Health Status */}
              {blockchainHealth && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Network Health Status</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className={`font-medium capitalize ${
                        blockchainHealth.status === 'healthy' ? 'text-green-600' :
                        blockchainHealth.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {blockchainHealth.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Nodes</p>
                      <p className="font-medium text-gray-900">{blockchainHealth.nodeCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Last Sync</p>
                      <p className="font-medium text-gray-900">
                        {blockchainHealth.lastSync ? new Date(blockchainHealth.lastSync).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Biometric Tab */}
          {activeTab === 'biometric' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Authentication Thresholds</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Threshold ({(config.biometric.confidenceThreshold * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={config.biometric.confidenceThreshold}
                      onChange={(e) => updateConfig({
                        biometric: {
                          ...config.biometric,
                          confidenceThreshold: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Liveness Threshold ({(config.biometric.livenessThreshold * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="1.0"
                      step="0.05"
                      value={config.biometric.livenessThreshold}
                      onChange={(e) => updateConfig({
                        biometric: {
                          ...config.biometric,
                          livenessThreshold: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.biometric.requireLiveness}
                    onChange={(e) => updateConfig({
                      biometric: {
                        ...config.biometric,
                        requireLiveness: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require liveness detection</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.biometric.antiSpoofingEnabled}
                    onChange={(e) => updateConfig({
                      biometric: {
                        ...config.biometric,
                        antiSpoofingEnabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable anti-spoofing protection</span>
                </label>
              </div>
            </div>
          )}

          {/* Election Tab */}
          {activeTab === 'election' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Election Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Voters Per Election
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="100000"
                      value={config.election.maxVotersPerElection}
                      onChange={(e) => updateConfig({
                        election: {
                          ...config.election,
                          maxVotersPerElection: parseInt(e.target.value)
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vote Receipt Format
                    </label>
                    <select
                      value={config.election.voteReceiptFormat}
                      onChange={(e) => updateConfig({
                        election: {
                          ...config.election,
                          voteReceiptFormat: e.target.value as 'qr' | 'text' | 'both'
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="qr">QR Code Only</option>
                      <option value="text">Text Only</option>
                      <option value="both">Both QR Code and Text</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.election.allowConcurrentElections}
                    onChange={(e) => updateConfig({
                      election: {
                        ...config.election,
                        allowConcurrentElections: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow concurrent elections</span>
                </label>
              </div>
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Audit Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retention Period (days)
                    </label>
                    <input
                      type="number"
                      min="365"
                      max="3650"
                      value={config.audit.retentionDays}
                      onChange={(e) => updateConfig({
                        audit: {
                          ...config.audit,
                          retentionDays: parseInt(e.target.value)
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-600 mt-1">Minimum 1 year, recommended 7 years</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Export Format
                    </label>
                    <select
                      value={config.audit.exportFormat}
                      onChange={(e) => updateConfig({
                        audit: {
                          ...config.audit,
                          exportFormat: e.target.value as 'json' | 'csv' | 'pdf'
                        }
                      })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.audit.hashChainEnabled}
                    onChange={(e) => updateConfig({
                      audit: {
                        ...config.audit,
                        hashChainEnabled: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable hash-chained audit logs</span>
                </label>
                <p className="text-sm text-gray-600 mt-1 ml-6">
                  Provides tamper-evident audit trail with cryptographic verification
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};