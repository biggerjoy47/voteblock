import React, { useState } from 'react';
import { Shield, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { VoterDatabaseService } from '../../services/voterDatabaseService';

interface VoterLoginProps {
  onNavigate: (view: string) => void;
  onLoginSuccess: (nin: string) => void;
}

export const VoterLogin: React.FC<VoterLoginProps> = ({ onNavigate, onLoginSuccess }) => {
  const [nin, setNin] = useState('');
  const [showNin, setShowNin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate NIN format
    if (nin.length !== 11 || !/^\d{11}$/.test(nin)) {
      setError('Please enter a valid 11-digit NIN');
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if voter exists in database
      const voter = await VoterDatabaseService.findVoterByNIN(nin);
      
      if (!voter) {
        setError('Voter not found. Please register first or check your NIN.');
        return;
      }

      if (!voter.isActive) {
        setError('Your account has been suspended. Please contact INEC for assistance.');
        return;
      }

      // Proceed to biometric verification
      onLoginSuccess(nin);
    } catch (error) {
      setError('Login failed. Please check your NIN and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => onNavigate('voter-portal')}
            className="flex items-center text-green-600 hover:text-green-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
          <div className="bg-green-600 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Voter Login</h1>
          <p className="text-gray-600">
            Enter your National Identification Number to continue
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="nin" className="block text-sm font-medium text-gray-700 mb-2">
                  National Identification Number (NIN)
                </label>
                <div className="relative">
                  <input
                    id="nin"
                    type={showNin ? 'text' : 'password'}
                    required
                    value={nin}
                    onChange={(e) => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors pr-12"
                    placeholder="Enter your 11-digit NIN"
                    maxLength={11}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNin(!showNin)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showNin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your NIN is encrypted and securely processed
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || nin.length !== 11}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLoading || nin.length !== 11
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Validating NIN...
                  </div>
                ) : (
                  'Continue to Biometric Verification'
                )}
              </button>
            </form>

            {/* Demo NINs */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Demo NINs for Testing:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>12345678901</strong> - Register first to use</p>
                <p><strong>12345678902</strong> - Register first to use</p>
                <p><strong>12345678903</strong> - Register first to use</p>
              </div>
            </div>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => onNavigate('voter-register')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Register here
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🔒 Your data is protected with end-to-end encryption</p>
          <p>🛡️ Compliant with Nigeria Data Protection Regulation (NDPR)</p>
        </div>
      </div>
    </div>
  );
};