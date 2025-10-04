import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Filter, TrendingUp, Users, Vote, Eye } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Election, ElectionResult, SystemStats } from '../../types';
import { ElectionService } from '../../services/electionService';
import { StorageService } from '../../services/storageService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

interface ResultsAnalyticsProps {
  onNavigate: (view: string) => void;
}

export const ResultsAnalytics: React.FC<ResultsAnalyticsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<string>('all');
  const [results, setResults] = useState<{ [electionId: string]: ElectionResult }>({});
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedElection, timeRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load elections
      const electionsData = await ElectionService.getAllElections();
      setElections(electionsData);

      // Load results for each election
      const resultsData: { [electionId: string]: ElectionResult } = {};
      for (const election of electionsData) {
        try {
          const result = await ElectionService.getElectionResults(election.id);
          resultsData[election.id] = result;
        } catch (error) {
          console.error(`Error loading results for election ${election.id}:`, error);
        }
      }
      setResults(resultsData);

      // Load system stats
      await loadSystemStats();
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const allVotes = await StorageService.getAllFromStore('votes');
      const allVoters = await StorageService.getAllFromStore('voters');
      const activeElections = elections.filter(e => e.status === 'active').length;
      
      const onlineVotes = allVotes.filter(v => !v.isOffline).length;
      const offlineVotes = allVotes.filter(v => v.isOffline).length;
      const syncPendingVotes = allVotes.filter(v => v.syncStatus === 'pending').length;

      // Get biometric success rate from audit logs
      const biometricLogs = await AuditService.getAuditLogs({
        action: AuditService.ACTIONS.BIOMETRIC_VERIFICATION,
        startDate: getStartDateForRange(timeRange)
      });
      
      const successfulBiometric = biometricLogs.filter(log => log.result === 'success').length;
      const biometricSuccessRate = biometricLogs.length > 0 ? (successfulBiometric / biometricLogs.length) * 100 : 0;

      // Get liveness success rate
      const livenessLogs = await AuditService.getAuditLogs({
        action: AuditService.ACTIONS.LIVENESS_CHECK,
        startDate: getStartDateForRange(timeRange)
      });
      
      const successfulLiveness = livenessLogs.filter(log => log.result === 'success').length;
      const livenessSuccessRate = livenessLogs.length > 0 ? (successfulLiveness / livenessLogs.length) * 100 : 0;

      setStats({
        totalVoters: allVoters.length,
        activeVoters: allVoters.filter(v => v.isActive).length,
        suspendedVoters: allVoters.filter(v => !v.isActive).length,
        totalVotes: allVotes.length,
        onlineVotes,
        offlineVotes,
        syncPendingVotes,
        biometricSuccessRate,
        livenessSuccessRate,
        activeElections,
        blockchainSyncStatus: navigator.onLine ? 'healthy' : 'offline',
        nodeCount: 3, // Simulated
        lastSyncTime: new Date()
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
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

  const getFilteredElections = () => {
    if (selectedElection === 'all') {
      return elections;
    }
    return elections.filter(e => e.id === selectedElection);
  };

  const getTurnoutData = () => {
    const filteredElections = getFilteredElections();
    const labels = filteredElections.map(e => e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title);
    const data = filteredElections.map(e => {
      const result = results[e.id];
      return result ? result.turnoutRate : 0;
    });

    return {
      labels,
      datasets: [{
        label: 'Voter Turnout (%)',
        data,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    };
  };

  const getVoteDistributionData = () => {
    if (!stats) return { labels: [], datasets: [] };

    return {
      labels: ['Online Votes', 'Offline Votes (Synced)', 'Pending Sync'],
      datasets: [{
        data: [stats.onlineVotes, stats.offlineVotes - stats.syncPendingVotes, stats.syncPendingVotes],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0
      }]
    };
  };

  const getBiometricTrendsData = () => {
    // Simulate trend data - in production, this would come from time-series audit logs
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const biometricData = [94, 96, 92, 95, 97, 93, 95];
    const livenessData = [89, 91, 87, 90, 93, 88, 92];

    return {
      labels,
      datasets: [
        {
          label: 'Biometric Success Rate (%)',
          data: biometricData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.1
        },
        {
          label: 'Liveness Detection Rate (%)',
          data: livenessData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.1
        }
      ]
    };
  };

  const exportResults = async (format: 'csv' | 'pdf') => {
    if (!user) return;

    try {
      const filteredElections = getFilteredElections();
      let exportData = '';

      if (format === 'csv') {
        const headers = ['Election', 'Type', 'Status', 'Total Votes', 'Turnout Rate', 'Leading Candidate', 'Leading Party', 'Vote Count', 'Percentage'];
        const csvRows = [headers.join(',')];

        filteredElections.forEach(election => {
          const result = results[election.id];
          if (result && result.candidateResults.length > 0) {
            const leading = result.candidateResults[0];
            const row = [
              `"${election.title}"`,
              election.type.replace('_', ' '),
              election.status,
              result.totalVotes,
              result.turnoutRate.toFixed(2),
              `"${leading.candidateName}"`,
              `"${leading.party}"`,
              leading.voteCount,
              leading.percentage.toFixed(2)
            ];
            csvRows.push(row.join(','));
          }
        });

        exportData = csvRows.join('\n');
      }

      const blob = new Blob([exportData], { type: format === 'csv' ? 'text/csv' : 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `election_results_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      await AuditService.logEvent(
        user.id,
        AuditService.ACTIONS.DATA_EXPORT,
        `Election results exported: ${format.toUpperCase()} format`,
        'success',
        { format, electionCount: filteredElections.length }
      );
    } catch (error) {
      console.error('Error exporting results:', error);
      alert('Error exporting results. Please try again.');
    }
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Results & Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time election monitoring and analytics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => exportResults('csv')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportResults('pdf')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Elections</option>
              {elections.map(election => (
                <option key={election.id} value={election.id}>
                  {election.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Votes Cast</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalVotes.toLocaleString()}</p>
                <p className="text-sm text-green-600">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  {stats.onlineVotes} online, {stats.offlineVotes} offline
                </p>
              </div>
              <Vote className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Voters</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeVoters.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {stats.suspendedVoters} suspended
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Biometric Success</p>
                <p className="text-3xl font-bold text-gray-900">{stats.biometricSuccessRate.toFixed(1)}%</p>
                <p className="text-sm text-blue-600">
                  Liveness: {stats.livenessSuccessRate.toFixed(1)}%
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blockchain Status</p>
                <p className="text-lg font-bold text-gray-900 capitalize">{stats.blockchainSyncStatus}</p>
                <p className="text-sm text-gray-600">
                  {stats.nodeCount} nodes active
                </p>
              </div>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                stats.blockchainSyncStatus === 'healthy' ? 'bg-green-100' : 
                stats.blockchainSyncStatus === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <div className={`h-4 w-4 rounded-full ${
                  stats.blockchainSyncStatus === 'healthy' ? 'bg-green-600' : 
                  stats.blockchainSyncStatus === 'degraded' ? 'bg-yellow-600' : 'bg-red-600'
                }`}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Voter Turnout by Election</h3>
          <div className="h-64">
            <Bar 
              data={getTurnoutData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Vote Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={getVoteDistributionData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Biometric Trends */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Biometric Authentication Trends</h3>
        <div className="h-64">
          <Line 
            data={getBiometricTrendsData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' }
              },
              scales: {
                y: { 
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: function(value) {
                      return value + '%';
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Election Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Election Results Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Election
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Votes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leading Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vote Share
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredElections().map((election) => {
                const result = results[election.id];
                const leading = result?.candidateResults[0];
                
                return (
                  <tr key={election.id}>
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{election.title}</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {election.type.replace('_', ' ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        election.status === 'active' ? 'bg-green-100 text-green-800' :
                        election.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        election.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {election.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result ? result.totalVotes.toLocaleString() : '0'}
                    </td>
                    <td className="px-6 py-4">
                      {leading ? (
                        <div>
                          <p className="font-medium text-gray-900">{leading.candidateName}</p>
                          <p className="text-sm text-gray-600">{leading.party}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">No votes yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {leading ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {leading.voteCount.toLocaleString()} votes
                          </p>
                          <p className="text-sm text-gray-600">
                            {leading.percentage.toFixed(1)}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigate(`election-details/${election.id}`)}
                        className="text-green-600 hover:text-green-700"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {getFilteredElections().length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No elections found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};