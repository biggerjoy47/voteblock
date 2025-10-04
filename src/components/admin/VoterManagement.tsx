import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Upload, UserCheck, UserX, Edit, Trash2, Filter } from 'lucide-react';
import { Voter } from '../../types';
import { StorageService } from '../../services/storageService';
import { NINService } from '../../services/ninService';
import { AuditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface VoterManagementProps {
  onNavigate: (view: string) => void;
}

export const VoterManagement: React.FC<VoterManagementProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [voterForm, setVoterForm] = useState({
    nin: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    state: '',
    lga: '',
    ward: '',
    pollingUnit: ''
  });

  useEffect(() => {
    loadVoters();
  }, []);

  useEffect(() => {
    filterVoters();
  }, [voters, searchTerm, filterStatus]);

  const loadVoters = async () => {
    try {
      setIsLoading(true);
      const votersData = await StorageService.getAllFromStore('voters');
      setVoters(votersData);
    } catch (error) {
      console.error('Error loading voters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterVoters = () => {
    let filtered = voters;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(voter =>
        voter.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.nin.includes(searchTerm) ||
        voter.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(voter =>
        filterStatus === 'active' ? voter.isActive : !voter.isActive
      );
    }

    setFilteredVoters(filtered);
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setIsLoading(true);

      // Validate NIN
      const ninResult = await NINService.validateNIN(voterForm.nin);
      if (!ninResult.valid) {
        alert(`NIN validation failed: ${ninResult.error}`);
        return;
      }

      // Check if voter already exists
      const existingVoter = voters.find(v => v.nin === voterForm.nin);
      if (existingVoter) {
        alert('A voter with this NIN already exists');
        return;
      }

      const newVoter: Voter = {
        id: crypto.randomUUID(),
        nin: voterForm.nin,
        ninHash: await CryptoService.generateHash(voterForm.nin + 'VOTER_SALT'),
        firstName: voterForm.firstName,
        lastName: voterForm.lastName,
        sex: 'male', // Default - should be collected in form
        dateOfBirth: new Date('1990-01-01'), // Default - should be collected in form
        email: voterForm.email,
        phone: voterForm.phone,
        state: voterForm.state,
        lga: voterForm.lga,
        ward: voterForm.ward,
        pollingUnit: voterForm.pollingUnit,
        
        // Biometric data (will be set during enrollment)
        biometricHash: '',
        faceEmbedding: [],
        biometricQuality: 0,
        
        registrationDate: new Date(),
        isVerified: false,
        isActive: true,
        registrationSource: 'online',
        eligibleElections: [],
        votingHistory: {},
        loginAttempts: 0,
        biometricAttempts: 0
      };

      await StorageService.addToStore('voters', newVoter);
      
      // Log voter registration
      await AuditService.logEvent(
        user.id,
        AuditService.ACTIONS.VOTER_REGISTRATION,
        `Voter registered: ${newVoter.firstName} ${newVoter.lastName}`,
        'success',
        { voterData: newVoter },
        newVoter.nin
      );

      setShowAddForm(false);
      resetForm();
      loadVoters();
    } catch (error) {
      console.error('Error adding voter:', error);
      alert('Error adding voter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspendVoter = async (voter: Voter) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to ${voter.isActive ? 'suspend' : 'activate'} ${voter.firstName} ${voter.lastName}?`)) {
      return;
    }

    try {
      const updatedVoter = { ...voter, isActive: !voter.isActive };
      await StorageService.updateInStore('voters', updatedVoter);
      
      await AuditService.logEvent(
        user.id,
        voter.isActive ? 'voter_suspended' : 'voter_activated',
        `Voter ${voter.isActive ? 'suspended' : 'activated'}: ${voter.firstName} ${voter.lastName}`,
        'success',
        { voterData: updatedVoter },
        voter.nin
      );

      loadVoters();
    } catch (error) {
      console.error('Error updating voter status:', error);
      alert('Error updating voter status. Please try again.');
    }
  };

  const handleBulkImport = async (csvData: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      const result = await NINService.bulkImportNINs(csvData);
      
      await AuditService.logEvent(
        user.id,
        'bulk_voter_import',
        `Bulk import completed: ${result.success} successful, ${result.errors.length} errors`,
        result.errors.length === 0 ? 'success' : 'failure',
        { result }
      );

      if (result.errors.length > 0) {
        alert(`Import completed with errors:\n${result.errors.slice(0, 5).join('\n')}`);
      } else {
        alert(`Successfully imported ${result.success} voters`);
      }

      setShowBulkImport(false);
      loadVoters();
    } catch (error) {
      console.error('Error during bulk import:', error);
      alert('Error during bulk import. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportVoters = async () => {
    if (!user) return;

    try {
      const csvHeaders = ['NIN', 'First Name', 'Last Name', 'Email', 'Phone', 'State', 'LGA', 'Ward', 'Polling Unit', 'Status', 'Registration Date'];
      const csvRows = [csvHeaders.join(',')];

      filteredVoters.forEach(voter => {
        const row = [
          voter.nin,
          voter.firstName,
          voter.lastName,
          voter.email || '',
          voter.phone || '',
          voter.state,
          voter.lga,
          voter.ward,
          voter.pollingUnit,
          voter.isActive ? 'Active' : 'Suspended',
          voter.registrationDate.toISOString().split('T')[0]
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voters_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      await AuditService.logEvent(
        user.id,
        AuditService.ACTIONS.DATA_EXPORT,
        `Voters data exported: ${filteredVoters.length} records`,
        'success'
      );
    } catch (error) {
      console.error('Error exporting voters:', error);
      alert('Error exporting voters. Please try again.');
    }
  };

  const resetForm = () => {
    setVoterForm({
      nin: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      state: '',
      lga: '',
      ward: '',
      pollingUnit: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voter Management</h1>
          <p className="text-gray-600 mt-1">Register and manage voters</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={exportVoters}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add Voter</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, NIN, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Voters</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Voters</p>
              <p className="text-3xl font-bold text-gray-900">{voters.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Voters</p>
              <p className="text-3xl font-bold text-green-600">{voters.filter(v => v.isActive).length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-3xl font-bold text-red-600">{voters.filter(v => !v.isActive).length}</p>
            </div>
            <UserX className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-3xl font-bold text-blue-600">{voters.filter(v => v.isVerified).length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Add Voter Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Add New Voter</h2>
            
            <form onSubmit={handleAddVoter} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIN</label>
                  <input
                    type="text"
                    required
                    value={voterForm.nin}
                    onChange={(e) => setVoterForm({...voterForm, nin: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={voterForm.firstName}
                    onChange={(e) => setVoterForm({...voterForm, firstName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={voterForm.lastName}
                    onChange={(e) => setVoterForm({...voterForm, lastName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={voterForm.email}
                    onChange={(e) => setVoterForm({...voterForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={voterForm.phone}
                    onChange={(e) => setVoterForm({...voterForm, phone: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    required
                    value={voterForm.state}
                    onChange={(e) => setVoterForm({...voterForm, state: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LGA</label>
                  <input
                    type="text"
                    required
                    value={voterForm.lga}
                    onChange={(e) => setVoterForm({...voterForm, lga: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ward</label>
                  <input
                    type="text"
                    required
                    value={voterForm.ward}
                    onChange={(e) => setVoterForm({...voterForm, ward: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Polling Unit</label>
                  <input
                    type="text"
                    required
                    value={voterForm.pollingUnit}
                    onChange={(e) => setVoterForm({...voterForm, pollingUnit: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Voter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
          isLoading={isLoading}
        />
      )}

      {/* Voters Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            Voters ({filteredVoters.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVoters.map((voter) => (
                <tr key={voter.id}>
                  <td className="px-6 py-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {voter.firstName} {voter.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">NIN: {voter.nin}</p>
                      {voter.email && (
                        <p className="text-sm text-gray-600">{voter.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <p>{voter.state}, {voter.lga}</p>
                      <p className="text-gray-600">{voter.ward}, {voter.pollingUnit}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        voter.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {voter.isActive ? 'Active' : 'Suspended'}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        voter.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {voter.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(voter.registrationDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleSuspendVoter(voter)}
                        className={`${
                          voter.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                        }`}
                        title={voter.isActive ? 'Suspend Voter' : 'Activate Voter'}
                      >
                        {voter.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVoters.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No voters found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Bulk Import Modal Component
interface BulkImportModalProps {
  onClose: () => void;
  onImport: (csvData: string) => void;
  isLoading: boolean;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onClose, onImport, isLoading }) => {
  const [csvData, setCsvData] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvData(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const sampleCSV = `nin,firstName,lastName,email,phone,state,lga,ward,pollingUnit
12345678901,John,Doe,john@example.com,08012345678,Lagos,Ikeja,Ward 01,PU 001
12345678902,Jane,Smith,jane@example.com,08087654321,Kano,Nassarawa,Ward 02,PU 002`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Bulk Import Voters</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Paste CSV Data
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="w-full h-40 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
              placeholder="Paste CSV data here..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Sample CSV Format:</h4>
            <pre className="text-sm text-blue-800 bg-blue-100 p-2 rounded overflow-x-auto">
              {sampleCSV}
            </pre>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onImport(csvData)}
              disabled={!csvData.trim() || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Importing...' : 'Import Voters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};