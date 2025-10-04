import React, { useState, useEffect } from 'react';
import { Vote, BarChart3, Clock, CheckCircle, User, LogOut, Eye, Download } from 'lucide-react';
import { Election, Candidate } from '../../types';
import { ElectionService } from '../../services/electionService';
import { VoterDatabaseService } from '../../services/voterDatabaseService';

interface VotingDashboardProps {
  onNavigate: (view: string) => void;
  nin: string;
}

export const VotingDashboard: React.FC<VotingDashboardProps> = ({ onNavigate, nin }) => {
  const [activeTab, setActiveTab] = useState<'vote' | 'dashboard'>('dashboard');
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [voter, setVoter] = useState<any>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [electionResults, setElectionResults] = useState<{ [electionId: string]: any }>({});

  useEffect(() => {
    loadVoterData();
    loadElections();
    
    // Set up interval to refresh elections every 30 seconds
    const interval = setInterval(() => {
      loadElections();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadVoterData = async () => {
    try {
      const voterData = await VoterDatabaseService.findVoterByNIN(nin);
      setVoter(voterData);
    } catch (error) {
      console.error('Error loading voter data:', error);
    }
  };

  const loadElections = async () => {
    try {
      const allElections = await ElectionService.getAllElections();
      
      // Show all active elections to voters (they can participate if eligible)
      const voterData = await VoterDatabaseService.findVoterByNIN(nin);
      if (voterData) {
        // Show all elections (active, upcoming, and completed for transparency)
        const visibleElections = allElections.filter(election => 
          election.status === 'active' || 
          election.status === 'completed' ||
          (election.status === 'draft' && new Date(election.startDate) > new Date())
        );
        setElections(visibleElections);
        
        // Load results for each election
        const results: { [electionId: string]: any } = {};
        for (const election of visibleElections) {
          try {
            const result = await ElectionService.getElectionResults(election.id);
            results[election.id] = result;
          } catch (error) {
            console.error(`Error loading results for ${election.id}:`, error);
          }
        }
        setElectionResults(results);
      }
      
    } catch (error) {
      console.error('Error loading elections:', error);
    }
  };

  const loadCandidates = async (electionId: string) => {
    try {
      const candidatesData = await ElectionService.getCandidatesByElection(electionId);
      setCandidates(candidatesData);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const handleElectionSelect = (election: Election) => {
    // Check if voter is eligible for this election
    if (!isVoterEligibleForElection(election)) {
      alert('You are not eligible to vote in this election based on your location.');
      return;
    }
    
    // Check if election is active
    const now = new Date();
    if (new Date(election.startDate) > now) {
      alert('This election has not started yet.');
      return;
    }
    
    if (new Date(election.endDate) < now) {
      alert('This election has ended.');
      return;
    }
    
    setSelectedElection(election);
    setSelectedCandidate('');
    loadCandidates(election.id);
    setActiveTab('vote');
  };

  const handleVoteSubmit = async () => {
    if (!selectedElection || !selectedCandidate) return;

    setIsVoting(true);
    
    try {
      // Cast vote
      const { vote, receiptCode } = await ElectionService.castVote({
        electionId: selectedElection.id,
        candidateId: selectedCandidate,
        voterId: voter?.id || nin,
        timestamp: new Date(),
        isOffline: !navigator.onLine
      });

      // Update voter's voting history
      if (voter) {
        await VoterDatabaseService.recordVote(voter.id, selectedElection.id, receiptCode);
      }

      setVoteReceipt(receiptCode);
      setShowReceipt(true);
      
      // Reset selection
      setSelectedElection(null);
      setSelectedCandidate('');
      setActiveTab('dashboard');
      
      // Reload data to reflect vote
      loadVoterData();
      loadElections();
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Error casting vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  const downloadReceipt = () => {
    const receiptData = `
NIGERIA E-VOTING SYSTEM
VOTE RECEIPT

Receipt Code: ${voteReceipt}
Election: ${selectedElection?.title}
Voter NIN: ${nin.slice(0, 3)}***${nin.slice(-2)}
Date: ${new Date().toLocaleString()}
Status: Confirmed

This receipt serves as proof of your vote.
Keep it safe for verification purposes.

Powered by INEC
    `;

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote_receipt_${voteReceipt.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);
    
    if (now < start) return { status: 'upcoming', color: 'bg-yellow-100 text-yellow-800' };
    if (now > end) return { status: 'ended', color: 'bg-gray-100 text-gray-800' };
    return { status: 'active', color: 'bg-green-100 text-green-800' };
  };

  const hasVotedInElection = (electionId: string): boolean => {
    return voter?.votingHistory[electionId]?.voted || false;
  };

  const getVotedCount = (): number => {
    if (!voter) return 0;
    return Object.values(voter.votingHistory).filter((history: any) => history.voted).length;
  };

  const isVoterEligibleForElection = (election: Election): boolean => {
    if (!voter) return false;
    
    // Check location-based eligibility
    if (election.type === 'presidential') {
      return true; // All voters eligible for presidential
    }
    
    if (election.state && voter.state !== election.state) {
      return false; // State-specific elections
    }
    
    if (election.lga && voter.lga !== election.lga) {
      return false; // LGA-specific elections
    }
    
    return true;
  };

  const canVoteInElection = (election: Election): boolean => {
    const now = new Date();
    const isActive = election.status === 'active' && 
                    new Date(election.startDate) <= now && 
                    new Date(election.endDate) >= now;
    const hasNotVoted = !hasVotedInElection(election.id);
    const isEligible = isVoterEligibleForElection(election);
    
    return isActive && hasNotVoted && isEligible;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Vote className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Voting Portal</h1>
                <p className="text-xs text-gray-600">NIN: {nin.slice(0, 3)}***{nin.slice(-2)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Verified Voter</span>
              </div>
              <button
                onClick={() => onNavigate('landing')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('vote')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'vote'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Vote className="h-4 w-4" />
              <span>Vote</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Election Dashboard</h2>
              <p className="text-gray-600">Monitor active elections and your voting status</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Elections</p>
                    <p className="text-3xl font-bold text-gray-900">{elections.length}</p>
                  </div>
                  <Vote className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Votes Cast</p>
                    <p className="text-3xl font-bold text-gray-900">{getVotedCount()}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Votes</p>
                    <p className="text-3xl font-bold text-gray-900">{elections.length - getVotedCount()}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Elections List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Available Elections</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {elections.map((election) => {
                  const status = getElectionStatus(election);
                  const voted = hasVotedInElection(election.id);
                  const result = electionResults[election.id];
                  
                  return (
                    <div key={election.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">{election.title}</h4>
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.status}
                            </span>
                            {voted && (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Voted
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{election.description}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Type: {election.type.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>Ends: {new Date(election.endDate).toLocaleDateString()}</span>
                            {election.state && (
                              <>
                                <span>•</span>
                                <span>Location: {election.state}</span>
                              </>
                            )}
                            {result && (
                              <>
                                <span>•</span>
                                <span>Total Votes: {result.totalVotes}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className={`font-medium ${
                              isVoterEligibleForElection(election) ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isVoterEligibleForElection(election) ? 'Eligible' : 'Not Eligible'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          {canVoteInElection(election) && (
                            <button
                              onClick={() => handleElectionSelect(election)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                            >
                              <Vote className="h-4 w-4" />
                              <span>Vote Now</span>
                            </button>
                          )}
                          {voted && (
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Vote Cast</span>
                            </div>
                          )}
                          {!isVoterEligibleForElection(election) && (
                            <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                              Not Eligible
                            </div>
                          )}
                          <button
                            onClick={() => {
                              // Show detailed results with better formatting
                              if (result) {
                                const resultText = `${election.title} - Results:\n\n` +
                                  result.candidateResults.map((c: any, index: number) => 
                                    `${index + 1}. ${c.candidateName} (${c.party})\n   ${c.voteCount} votes (${c.percentage.toFixed(1)}%)`
                                  ).join('\n\n') +
                                  `\n\nTotal Votes: ${result.totalVotes}`;
                                alert(resultText);
                              }
                            }}
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Results</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Live Results Preview */}
                      {result && result.candidateResults.length > 0 && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">Live Results:</h5>
                          <div className="space-y-2">
                            {result.candidateResults.slice(0, 3).map((candidate: any, index: number) => (
                              <div key={candidate.candidateId} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-500 text-white' :
                                    index === 1 ? 'bg-gray-400 text-white' :
                                    'bg-orange-600 text-white'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="font-medium">{candidate.candidateName}</span>
                                  <span className="text-gray-600">({candidate.party})</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold">{candidate.voteCount}</span>
                                  <span className="text-gray-600 ml-1">({candidate.percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {elections.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <Vote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No active elections available at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vote' && (
          <div className="space-y-6">
            {selectedElection ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedElection.title}</h2>
                    <p className="text-gray-600">{selectedElection.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedElection(null);
                      setSelectedCandidate('');
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    ← Back to Elections
                  </button>
                </div>

                {/* Candidates */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Select Your Candidate</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-4">
                      {candidates.map((candidate) => (
                        <label
                          key={candidate.id}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedCandidate === candidate.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="candidate"
                            value={candidate.id}
                            checked={selectedCandidate === candidate.id}
                            onChange={(e) => setSelectedCandidate(e.target.value)}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-medium text-gray-900">{candidate.name}</h4>
                                <p className="text-green-600 font-medium">{candidate.party}</p>
                                {candidate.biography && (
                                  <p className="text-gray-600 text-sm mt-1">{candidate.biography}</p>
                                )}
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedCandidate === candidate.id
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedCandidate === candidate.id && (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Vote Button */}
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={handleVoteSubmit}
                        disabled={!selectedCandidate || isVoting}
                        className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                          !selectedCandidate || isVoting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white flex items-center space-x-2`}
                      >
                        {isVoting ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Casting Vote...</span>
                          </>
                        ) : (
                          <>
                            <Vote className="h-5 w-5" />
                            <span>Cast My Vote</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Vote className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Election</h3>
                <p className="text-gray-600 mb-6">Choose an election from the dashboard to cast your vote</p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Vote Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vote Cast Successfully!</h2>
              <p className="text-gray-600 mb-6">Your vote has been recorded securely on the blockchain.</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Receipt Code:</p>
                <p className="font-mono text-lg font-bold text-gray-900">{voteReceipt}</p>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={downloadReceipt}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Receipt</span>
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};