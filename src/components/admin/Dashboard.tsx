import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Vote, 
  Shield, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Election, SystemStats } from '../../types';
import { ElectionService } from '../../services/electionService';
import { StorageService } from '../../services/storageService';
import { BlockchainService } from '../../services/blockchainService';
import { VoterDatabaseService, VoterStats } from '../../services/voterDatabaseService';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [elections, setElections] = useState<Election[]>([]);
  const [voterStats, setVoterStats] = useState<VoterStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [blockchainHealth, setBlockchainHealth] = useState<boolean>(false);

  useEffect(() => {
    loadDashboardData();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      const electionsData = await ElectionService.getAllElections();
      setElections(electionsData);

      // Load voter statistics
      const stats = await VoterDatabaseService.getVoterStatistics();
      setVoterStats(stats);

      // Check blockchain health
      const isValid = await BlockchainService.validateBlockchain();
      setBlockchainHealth(isValid);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getVotersByStateData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    const states = Object.keys(voterStats.votersByState);
    const counts = Object.values(voterStats.votersByState);

    return {
      labels: states,
      datasets: [{
        label: 'Registered Voters by State',
        data: counts,
        backgroundColor: [
          '#10B981', // Green
          '#059669', // Dark Green
          '#047857', // Darker Green
          '#065F46', // Darkest Green
          '#064E3B', // Forest Green
          '#0F766E', // Teal
          '#0D9488', // Light Teal
          '#14B8A6', // Cyan
          '#06B6D4', // Sky
          '#0EA5E9'  // Blue
        ],
        borderWidth: 0
      }]
    };
  };

  const getGenderDistributionData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    return {
      labels: ['Male', 'Female'],
      datasets: [{
        data: [voterStats.genderDistribution.male, voterStats.genderDistribution.female],
        backgroundColor: ['#3B82F6', '#EC4899'],
        borderWidth: 0
      }]
    };
  };

  const handleSyncOfflineVotes = async () => {
    if (!isOnline) {
      alert('Cannot sync votes while offline');
      return;
    }

    try {
      const syncedCount = await ElectionService.syncOfflineVotes();
      alert(`Successfully synced ${syncedCount} offline votes`);
      loadDashboardData();
    } catch (error) {
      console.error('Error syncing votes:', error);
      alert('Error syncing offline votes');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Election Dashboard</h1>
          <p className="text-gray-600 mt-1">Nigeria Electronic Voting System - INEC</p>
        </div>
        
        {/* System Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <><Wifi className="h-5 w-5 text-green-600" /><span className="text-green-600">Online</span></>
            ) : (
              <><WifiOff className="h-5 w-5 text-red-600" /><span className="text-red-600">Offline</span></>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {blockchainHealth ? (
              <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-green-600">Blockchain OK</span></>
            ) : (
              <><AlertCircle className="h-5 w-5 text-red-600" /><span className="text-red-600">Blockchain Issue</span></>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Voters</p>
              <p className="text-3xl font-bold text-gray-900">{voterStats?.totalVoters.toLocaleString() || 0}</p>
              <p className="text-sm text-green-600">{voterStats?.verifiedVoters || 0} verified</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Voters</p>
              <p className="text-3xl font-bold text-gray-900">{voterStats?.activeVoters.toLocaleString() || 0}</p>
              <p className="text-sm text-red-600">{voterStats?.suspendedVoters || 0} suspended</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Elections</p>
              <p className="text-3xl font-bold text-gray-900">{elections.filter(e => e.status === 'active').length}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">States Covered</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(voterStats?.votersByState || {}).length}</p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Registered Voters by State</h3>
          <div className="h-64">
            <Bar 
              data={getVotersByStateData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: { beginAtZero: true }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Gender Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={getGenderDistributionData()} 
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

      {/* Recent Elections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Recent Elections</h3>
          <button
            onClick={() => onNavigate('elections')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            View All
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {elections.slice(0, 5).map((election) => (
              <div key={election.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{election.title}</h4>
                  <p className="text-sm text-gray-600 capitalize">
                    {election.type.replace('_', ' ')} • {election.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {new Date(election.startDate).toLocaleDateString()}
                  </p>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    election.status === 'active' ? 'bg-green-100 text-green-800' :
                    election.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    election.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {election.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('elections')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="font-semibold">Manage Elections</h3>
          <p className="text-sm text-gray-600">Create and configure elections</p>
        </button>

        <button
          onClick={() => onNavigate('results')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <Vote className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="font-semibold">View Results</h3>
          <p className="text-sm text-gray-600">Monitor election results</p>
        </button>

        <button
          onClick={() => onNavigate('audit')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <Shield className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="font-semibold">Audit Trail</h3>
          <p className="text-sm text-gray-600">Review system logs</p>
        </button>
      </div>
    </div>
  );
};