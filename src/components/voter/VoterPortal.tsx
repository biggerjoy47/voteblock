import React from 'react';
import { Vote, UserPlus, Shield, CheckCircle } from 'lucide-react';

interface VoterPortalProps {
  onNavigate: (view: string) => void;
}

export const VoterPortal: React.FC<VoterPortalProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-green-600 p-2 rounded-lg">
                <Vote className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Nigeria E-Voting System</h1>
                <p className="text-xs text-gray-600">Voter Portal</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('landing')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Voter Portal
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Secure, transparent, and accessible electronic voting for all Nigerian citizens
          </p>
          <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>Biometric Secured</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span>NIN Verified</span>
            </div>
            <div className="flex items-center space-x-2">
              <Vote className="h-5 w-5 text-purple-600" />
              <span>Blockchain Protected</span>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Login</h3>
                  <p className="text-green-100">Access your account</p>
                </div>
              </div>
              <p className="text-green-100 mb-6">
                Already registered? Login with your NIN and biometric verification to access elections.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-200" />
                  <span className="text-sm">NIN authentication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-200" />
                  <span className="text-sm">Biometric verification</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-200" />
                  <span className="text-sm">Secure voting access</span>
                </div>
              </div>
            </div>
            <div className="p-8">
              <button
                onClick={() => onNavigate('voter-login')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Login to Vote
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Secure access with NIN and biometric verification
              </p>
            </div>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <UserPlus className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Register</h3>
                  <p className="text-blue-100">Create new account</p>
                </div>
              </div>
              <p className="text-blue-100 mb-6">
                New voter? Register with your NIN and complete biometric enrollment to participate in elections.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-200" />
                  <span className="text-sm">NIN validation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-200" />
                  <span className="text-sm">Personal information</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-200" />
                  <span className="text-sm">Biometric enrollment</span>
                </div>
              </div>
            </div>
            <div className="p-8">
              <button
                onClick={() => onNavigate('voter-register')}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Register to Vote
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Complete registration with NIN and biometric data
              </p>
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How Electronic Voting Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Secure Authentication</h3>
              <p className="text-gray-600 text-sm">
                Login with your NIN and complete biometric verification for maximum security.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Cast Your Vote</h3>
              <p className="text-gray-600 text-sm">
                Select your preferred candidates in available elections with an intuitive interface.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Verify & Confirm</h3>
              <p className="text-gray-600 text-sm">
                Receive a secure receipt and track your vote on the blockchain ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};