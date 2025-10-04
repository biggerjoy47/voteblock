import React, { useState, useEffect } from 'react';
import { Shield, Download, Search, Filter, CheckCircle, AlertCircle, Clock, Eye } from 'lucide-react';
import { AuditLog } from '../../types';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface AuditDashboardProps {
  onNavigate: (view: string) => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<'all' | 'success' | 'failure' | 'pending'>('all');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [auditStats, setAuditStats] = useState<any>(null);
  const [chainIntegrity, setChainIntegrity] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditData();
  }, [dateRange]);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchTerm, filterAction, filterResult]);

  const loadAuditData = async () => {
    try {
      setIsLoading(true);
      
      const startDate = getStartDateForRange(dateRange);
      const logs = await AuditService.getAuditLogs({
        startDate: dateRange === 'all' ? undefined : startDate,
        limit: 1000
      });
      
      setAuditLogs(logs);
      
      // Load audit statistics
      const stats = await AuditService.getAuditStats();
      setAuditStats(stats);
      
      // Verify chain integrity
      const integrity = await AuditService.verifyChainIntegrity();
      setChainIntegrity(integrity);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStartDateForRange = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  };

  const filterLogs = () => {
    let filtered = auditLogs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.voterNin && log.voterNin.includes(searchTerm))
      );
    }

    // Filter by action
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Filter by result
    if (filterResult !== 'all') {
      filtered = filtered.filter(log => log.result === filterResult);
    }

    setFilteredLogs(filtered);
  };

  const exportAuditLogs = async (format: 'csv' | 'json') => {
    if (!user) return;

    try {
      let exportData = '';
      
      if (format === 'csv') {
        exportData = await AuditService.exportToCSV({
          startDate: dateRange === 'all' ? undefined : getStartDateForRange(dateRange)
        });
      } else {
        exportData = JSON.stringify(filteredLogs, null, 2);
      }

      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      await AuditService.logEvent(
        user.id,
        AuditService.ACTIONS.DATA_EXPORT,
        `Audit logs exported: ${format.toUpperCase()} format`,
        'success',
        { format, recordCount: filteredLogs.length }
      );
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('Error exporting audit logs. Please try again.');
    }
  };

  const verifyChainIntegrity = async () => {
    try {
      setIsLoading(true);
      const integrity = await AuditService.verifyChainIntegrity();
      setChainIntegrity(integrity);
      
      if (user) {
        await AuditService.logEvent(
          user.id,
          AuditService.ACTIONS.AUDIT_CHAIN_VERIFIED,
          `Audit chain verification: ${integrity.valid ? 'PASSED' : 'FAILED'}`,
          integrity.valid ? 'success' : 'failure',
          { errors: integrity.errors }
        );
      }
    } catch (error) {
      console.error('Error verifying chain integrity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login') || action.includes('auth')) {
      return <Shield className="h-4 w-4" />;
    }
    if (action.includes('vote')) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (action.includes('biometric') || action.includes('liveness')) {
      return <Eye className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'failure':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">Comprehensive system audit logging and verification</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={verifyChainIntegrity}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            <span>Verify Chain</span>
          </button>
          <button
            onClick={() => exportAuditLogs('csv')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportAuditLogs('json')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Audit Statistics */}
      {auditStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-bold text-gray-900">{auditStats.totalEvents.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful Events</p>
                <p className="text-3xl font-bold text-green-600">{auditStats.successfulEvents.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {auditStats.totalEvents > 0 ? ((auditStats.successfulEvents / auditStats.totalEvents) * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Events</p>
                <p className="text-3xl font-bold text-red-600">{auditStats.failedEvents.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {auditStats.uniqueUsers} unique users
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chain Integrity</p>
                <p className={`text-3xl font-bold ${chainIntegrity?.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {chainIntegrity?.valid ? 'VALID' : 'INVALID'}
                </p>
                <p className="text-sm text-gray-600">
                  {chainIntegrity?.errors.length || 0} errors found
                </p>
              </div>
              <Shield className={`h-8 w-8 ${chainIntegrity?.valid ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Chain Integrity Alert */}
      {chainIntegrity && !chainIntegrity.valid && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Audit Chain Integrity Issues Detected
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {chainIntegrity.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {chainIntegrity.errors.length > 3 && (
                    <li>... and {chainIntegrity.errors.length - 3} more errors</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Results</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Audit Logs ({filteredLogs.length.toLocaleString()})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User/Voter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium text-gray-900">
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <p>{log.userId}</p>
                      {log.voterNin && (
                        <p className="text-gray-600">NIN: {log.voterNin.slice(0, 3)}***{log.voterNin.slice(-2)}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getResultColor(log.result)}`}>
                      {log.result.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-green-600 hover:text-green-700"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No audit logs found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Audit Log Details</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Result</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getResultColor(selectedLog.result)}`}>
                    {selectedLog.result.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <p className="text-sm text-gray-900">{selectedLog.action.replace(/_/g, ' ').toUpperCase()}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">User ID</label>
                <p className="text-sm text-gray-900">{selectedLog.userId}</p>
              </div>

              {selectedLog.voterNin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Voter NIN</label>
                  <p className="text-sm text-gray-900">{selectedLog.voterNin.slice(0, 3)}***{selectedLog.voterNin.slice(-2)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Details</label>
                <p className="text-sm text-gray-900">{selectedLog.details}</p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <pre className="text-sm text-gray-900 bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.hash && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hash</label>
                  <p className="text-sm text-gray-900 font-mono break-all">{selectedLog.hash}</p>
                </div>
              )}

              {selectedLog.sessionId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedLog.sessionId}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};