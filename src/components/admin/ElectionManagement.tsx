import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Users, Settings } from 'lucide-react';
import { Election, Candidate } from '../../types';
import { ElectionService } from '../../services/electionService';
import { useAuth } from '../../hooks/useAuth';

interface ElectionManagementProps {
  onNavigate: (view: string) => void;
}

export const ElectionManagement: React.FC<ElectionManagementProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCandidateManager, setShowCandidateManager] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    type: 'presidential' as const,
    description: '',
    startDate: '',
    endDate: '',
    state: '',
    lga: '',
    constituency: ''
  });

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const electionsData = await ElectionService.getAllElections();
      setElections(electionsData);
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

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const newElection = await ElectionService.createElection({
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        status: 'draft',
        createdBy: user.id
      });
      
      alert(`Election "${newElection.title}" created successfully! It will appear on voter pages when activated.`);
      
      setShowCreateForm(false);
      setFormData({
        title: '',
        type: 'presidential',
        description: '',
        startDate: '',
        endDate: '',
        state: '',
        lga: '',
        constituency: ''
      });
      loadElections();
    } catch (error) {
      console.error('Error creating election:', error);
    }
  };

  const handleDeleteElection = async (electionId: string) => {
    if (!confirm('Are you sure you want to delete this election?')) return;
    
    try {
      // In a real implementation, you'd have a delete method
      console.log('Delete election:', electionId);
    } catch (error) {
      console.error('Error deleting election:', error);
    }
  };

  const handleActivateElection = async (election: Election) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to activate "${election.title}"? This will make it available for voting.`)) {
      return;
    }
    
    try {
      const updatedElection = await ElectionService.updateElection(
        election.id,
        { status: 'active' },
        user.id
      );
      
      alert(`Election "${updatedElection.title}" is now active and available for voting!`);
      loadElections();
    } catch (error) {
      console.error('Error activating election:', error);
      alert('Error activating election. Please try again.');
    }
  };

  const handleManageCandidates = (election: Election) => {
    setSelectedElection(election);
    setShowCandidateManager(true);
    loadCandidates(election.id);
  };

  const handleAddCandidate = async (candidateData: Omit<Candidate, 'id'>) => {
    try {
      await ElectionService.createCandidate(candidateData);
      if (selectedElection) {
        loadCandidates(selectedElection.id);
      }
    } catch (error) {
      console.error('Error adding candidate:', error);
    }
  };

  const getElectionTypeColor = (type: string) => {
    const colors = {
      presidential: 'bg-purple-100 text-purple-800',
      gubernatorial: 'bg-blue-100 text-blue-800',
      national_assembly: 'bg-green-100 text-green-800',
      state_assembly: 'bg-yellow-100 text-yellow-800',
      local_government: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (showCandidateManager && selectedElection) {
    return (
      <CandidateManager
        election={selectedElection}
        candidates={candidates}
        onBack={() => setShowCandidateManager(false)}
        onAddCandidate={handleAddCandidate}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Election Management</h1>
          <p className="text-gray-600 mt-1">Create and manage elections</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Election</span>
        </button>
      </div>

      {/* Create Election Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create New Election</h2>
            
            <form onSubmit={handleCreateElection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Election Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 2024 Presidential Election"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Election Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="presidential">Presidential</option>
                  <option value="gubernatorial">Gubernatorial</option>
                  <option value="national_assembly">National Assembly</option>
                  <option value="state_assembly">State Assembly</option>
                  <option value="local_government">Local Government</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Election description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {formData.type !== 'presidential' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Lagos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Local Government Area</label>
                    <input
                      type="text"
                      value={formData.lga}
                      onChange={(e) => setFormData({...formData, lga: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Ikeja"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Election
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Elections Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">All Elections</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Election
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elections.map((election) => (
                <tr key={election.id}>
                  <td className="px-6 py-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{election.title}</h4>
                      {election.description && (
                        <p className="text-sm text-gray-600">{election.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getElectionTypeColor(election.type)}`}>
                      {election.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <p>{new Date(election.startDate).toLocaleDateString()}</p>
                      <p className="text-gray-600">to {new Date(election.endDate).toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                      {election.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {election.state && election.lga ? `${election.state}, ${election.lga}` : 'National'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleManageCandidates(election)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Manage Candidates"
                      >
                        <Users className="h-4 w-4" />
                      </button>
                      {election.status === 'draft' && (
                        <button
                          onClick={() => handleActivateElection(election)}
                          className="text-green-600 hover:text-green-700"
                          title="Activate Election"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onNavigate(`results/${election.id}`)}
                        className="text-purple-600 hover:text-purple-700"
                        title="View Results"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteElection(election.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete Election"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Candidate Manager Component
interface CandidateManagerProps {
  election: Election;
  candidates: Candidate[];
  onBack: () => void;
  onAddCandidate: (candidate: Omit<Candidate, 'id'>) => void;
}

const CandidateManager: React.FC<CandidateManagerProps> = ({ election, candidates, onBack, onAddCandidate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    party: '',
    position: candidates.length + 1,
    biography: '',
    manifesto: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCandidate({
      ...candidateForm,
      electionId: election.id
    });
    setCandidateForm({
      name: '',
      party: '',
      position: candidates.length + 2,
      biography: '',
      manifesto: ''
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="text-green-600 hover:text-green-700 mb-2"
          >
            ← Back to Elections
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Manage Candidates</h1>
          <p className="text-gray-600 mt-1">{election.title}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add Candidate</span>
        </button>
      </div>

      {/* Add Candidate Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Candidate</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Candidate Name</label>
                <input
                  type="text"
                  required
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({...candidateForm, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Political Party</label>
                <input
                  type="text"
                  required
                  value={candidateForm.party}
                  onChange={(e) => setCandidateForm({...candidateForm, party: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biography</label>
              <textarea
                value={candidateForm.biography}
                onChange={(e) => setCandidateForm({...candidateForm, biography: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Candidate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Candidates List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Candidates ({candidates.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{candidate.name}</h4>
                  <p className="text-green-600 font-medium">{candidate.party}</p>
                  {candidate.biography && (
                    <p className="text-gray-600 mt-2">{candidate.biography}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                    Position {candidate.position}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No candidates added yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};