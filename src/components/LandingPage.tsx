import React from 'react';
import { Vote, Shield, Users, CheckCircle, Lock, Eye, Globe, Award } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'voter' | 'admin') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
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
                <p className="text-xs text-gray-600">Independent National Electoral Commission</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Secure Digital Democracy
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Nigeria's most advanced electronic voting platform powered by blockchain technology, 
              biometric authentication, and end-to-end encryption.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">INEC Certified</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-600">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">Blockchain Secured</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-600">
                <Eye className="h-5 w-5" />
                <span className="text-sm font-medium">Biometric Verified</span>
              </div>
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Voter Portal Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Voter Portal</h3>
                    <p className="text-green-100">Cast your vote securely</p>
                  </div>
                </div>
                <p className="text-green-100 mb-6">
                  Register as a new voter or login with your existing credentials to participate in elections.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-200" />
                    <span className="text-sm">NIN-based registration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-200" />
                    <span className="text-sm">Biometric authentication</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-200" />
                    <span className="text-sm">Encrypted vote storage</span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <button
                  onClick={() => onNavigate('voter-portal')}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Enter Voter Portal
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  New voters will be guided through registration
                </p>
              </div>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Shield className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Admin Portal</h3>
                    <p className="text-blue-100">Manage elections & voters</p>
                  </div>
                </div>
                <p className="text-blue-100 mb-6">
                  Administrative dashboard for election officials to manage the voting process.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-200" />
                    <span className="text-sm">Election management</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-200" />
                    <span className="text-sm">Voter administration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-200" />
                    <span className="text-sm">Real-time analytics</span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Enter Admin Portal
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Authorized personnel only
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Advanced Security Features
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform implements multiple layers of security to ensure the integrity 
              and transparency of the electoral process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Blockchain Security</h3>
              <p className="text-gray-600">
                Every vote is recorded on an immutable blockchain ledger, ensuring complete 
                transparency and preventing tampering.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Biometric Authentication</h3>
              <p className="text-gray-600">
                Advanced facial recognition with liveness detection prevents identity fraud 
                and ensures only eligible voters can participate.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">NIN Integration</h3>
              <p className="text-gray-600">
                Seamless integration with NIMC database for real-time voter verification 
                and eligibility confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Millions
            </h2>
            <p className="text-lg text-gray-600">
              Our platform has been tested and validated for large-scale electoral processes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
              <div className="text-gray-600">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">256-bit</div>
              <div className="text-gray-600">Encryption</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">100M+</div>
              <div className="text-gray-600">Voters Supported</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h3 className="text-2xl font-bold mb-2">Regulatory Compliance</h3>
                <p className="text-green-100">
                  Fully compliant with Nigerian electoral laws and international security standards.
                </p>
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">INEC Certified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">NDPR Compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">ISO 27001</span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white/20 p-4 rounded-full mb-2">
                  <Shield className="h-12 w-12 mx-auto" />
                </div>
                <div className="text-sm font-medium">Certified Secure</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <Vote className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Nigeria E-Voting</h3>
                  <p className="text-sm text-gray-400">INEC Official Platform</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Empowering democratic participation through secure, transparent, 
                and accessible electronic voting technology.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Independent National Electoral Commission</p>
                <p>Plot 436, Zambezi Street, Maitama, Abuja</p>
                <p>Phone: +234-9-8734-4444</p>
                <p>Email: info@inec.gov.ng</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Technical Support: 24/7</p>
                <p>Voter Helpline: 0800-VOTE-NG</p>
                <p>Emergency Contact: +234-9-8734-5555</p>
                <p>Data Protection: dpo@inec.gov.ng</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 Independent National Electoral Commission (INEC). All rights reserved.</p>
            <p className="mt-2">Secure • Transparent • Democratic</p>
          </div>
        </div>
      </footer>
    </div>
  );
};