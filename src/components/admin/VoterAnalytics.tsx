import React, { useState, useEffect } from 'react';
import { Users, MapPin, BarChart3, Download, Filter, TrendingUp, Calendar } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { VoterDatabaseService, VoterStats } from '../../services/voterDatabaseService';
import { useAuth } from '../../hooks/useAuth';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

interface VoterAnalyticsProps {
  onNavigate: (view: string) => void;
}

export const VoterAnalytics: React.FC<VoterAnalyticsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [voterStats, setVoterStats] = useState<VoterStats | null>(null);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadVoterAnalytics();
  }, [selectedState, timeRange]);

  const loadVoterAnalytics = async () => {
    try {
      setIsLoading(true);
      const stats = await VoterDatabaseService.getVoterStatistics();
      setVoterStats(stats);
    } catch (error) {
      console.error('Error loading voter analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStateDistributionData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    const sortedStates = Object.entries(voterStats.votersByState)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 states

    return {
      labels: sortedStates.map(([state]) => state),
      datasets: [{
        label: 'Registered Voters',
        data: sortedStates.map(([,count]) => count),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    };
  };

  const getAgeDistributionData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    return {
      labels: voterStats.ageDistribution.map(item => item.ageGroup),
      datasets: [{
        data: voterStats.ageDistribution.map(item => item.count),
        backgroundColor: [
          '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E'
        ],
        borderWidth: 0
      }]
    };
  };

  const getRegistrationTrendsData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    return {
      labels: voterStats.registrationTrends.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        label: 'Daily Registrations',
        data: voterStats.registrationTrends.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true
      }]
    };
  };

  const getVotingParticipationData = () => {
    if (!voterStats) return { labels: [], datasets: [] };

    const participationData = Object.entries(voterStats.votingParticipation);
    
    return {
      labels: participationData.map(([electionId]) => `Election ${electionId.slice(0, 8)}`),
      datasets: [{
        label: 'Participation Rate (%)',
        data: participationData.map(([,data]) => data.percentage),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1
      }]
    };
  };

  const exportAnalytics = async (format: 'csv' | 'json') => {
    if (!user || !voterStats) return;

    try {
      let exportData = '';
      
      if (format === 'csv') {
        // Create comprehensive CSV export
        const headers = ['Metric', 'Value', 'Category'];
        const csvRows = [headers.join(',')];

        // Add basic stats
        csvRows.push(`Total Voters,${voterStats.totalVoters},Overview`);
        csvRows.push(`Verified Voters,${voterStats.verifiedVoters},Overview`);
        csvRows.push(`Active Voters,${voterStats.activeVoters},Overview`);
        csvRows.push(`Suspended Voters,${voterStats.suspendedVoters},Overview`);

        // Add state distribution
        Object.entries(voterStats.votersByState).forEach(([state, count]) => {
          csvRows.push(`${state},${count},State Distribution`);
        });

        // Add age distribution
        voterStats.ageDistribution.forEach(item => {
          csvRows.push(`Age ${item.ageGroup},${item.count},Age Distribution`);
        });

        exportData = csvRows.join('\n');
      } else {
        exportData = JSON.stringify(voterStats, null, 2);
      }

      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voter_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Error exporting analytics. Please try again.');
    }
  };

  if (isLoading || !voterStats) {
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
          <h1 className="text-3xl font-bold text-gray-900">Voter Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive voter registration and participation analytics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => exportAnalytics('csv')}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportAnalytics('json')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All States</option>
              {Object.keys(voterStats.votersByState).map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Registered</p>
              <p className="text-3xl font-bold text-gray-900">{voterStats.totalVoters.toLocaleString()}</p>
              <p className="text-sm text-green-600">
                <TrendingUp className="inline h-4 w-4 mr-1" />
                {voterStats.verifiedVoters} verified
              </p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gender Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {((voterStats.genderDistribution.female / voterStats.totalVoters) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Female participation</p>
            </div>
            <Users className="h-8 w-8 text-pink-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">States Covered</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(voterStats.votersByState).length}</p>
              <p className="text-sm text-gray-600">of 36 + FCT</p>
            </div>
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Participation</p>
              <p className="text-3xl font-bold text-gray-900">
                {Object.values(voterStats.votingParticipation).length > 0 
                  ? (Object.values(voterStats.votingParticipation).reduce((sum, p) => sum + p.percentage, 0) / Object.values(voterStats.votingParticipation).length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-sm text-gray-600">Across elections</p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Top 10 States by Registration</h3>
          <div className="h-64">
            <Bar 
              data={getStateDistributionData()} 
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

        {/* Age Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
          <div className="h-64">
            <Doughnut 
              data={getAgeDistributionData()} 
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

        {/* Registration Trends */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Registration Trends (Last 30 Days)</h3>
          <div className="h-64">
            <Line 
              data={getRegistrationTrendsData()} 
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

        {/* Voting Participation */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Election Participation Rates</h3>
          <div className="h-64">
            <Bar 
              data={getVotingParticipationData()} 
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
      </div>

      {/* Detailed State Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">State-wise Voter Registration</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Voters
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Male
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Female
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(voterStats.votersByState)
                .sort(([,a], [,b]) => b - a)
                .map(([state, count]) => {
                  const percentage = ((count / voterStats.totalVoters) * 100).toFixed(1);
                  // Simulate gender breakdown per state
                  const maleCount = Math.floor(count * 0.52);
                  const femaleCount = count - maleCount;
                  
                  return (
                    <tr key={state}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{state}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {maleCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {femaleCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedState(state)}
                          className="text-green-600 hover:text-green-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* LGA Breakdown for Selected State */}
      {selectedState !== 'all' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">LGA Breakdown - {selectedState}</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(voterStats.votersByLGA)
                .filter(([lga]) => lga.startsWith(selectedState))
                .map(([lga, count]) => (
                  <div key={lga} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{lga.split(' - ')[1]}</h4>
                    <p className="text-2xl font-bold text-green-600">{count}</p>
                    <p className="text-sm text-gray-600">registered voters</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};