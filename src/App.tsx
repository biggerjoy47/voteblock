import React, { useState, useEffect, createContext } from 'react';
import { AuthContext, useAuthProvider } from './hooks/useAuth';
import { SecureStorageService } from './services/secureStorageService';
import { BlockchainService } from './services/blockchainService';
import { BiometricSecurityService } from './services/biometricSecurityService';
import { NINValidationService } from './services/ninValidationService';
import { AuditSecurityService } from './services/auditSecurityService';
import { ConfigService } from './services/configService';
import { LandingPage } from './components/LandingPage';

// Components
import { LoginForm } from './components/admin/LoginForm';
import { Layout } from './components/admin/Layout';
import { Dashboard } from './components/admin/Dashboard';
import { ElectionManagement } from './components/admin/ElectionManagement';
import { VoterManagement } from './components/admin/VoterManagement';
import { ResultsAnalytics } from './components/admin/ResultsAnalytics';
import { AuditDashboard } from './components/admin/AuditDashboard';
import { SystemSettings } from './components/admin/SystemSettings';
import { VoterAnalytics } from './components/admin/VoterAnalytics';
import { VoterPortal } from './components/voter/VoterPortal';
import { VoterLogin } from './components/voter/VoterLogin';
import { VoterRegister } from './components/voter/VoterRegister';
import { BiometricVerification } from './components/voter/BiometricVerification';
import { VotingDashboard } from './components/voter/VotingDashboard';
import { VoterDatabaseService } from './services/voterDatabaseService';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [isInitialized, setIsInitialized] = useState(false);
  const [voterNIN, setVoterNIN] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);
  const authProvider = useAuthProvider();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize storage
      await SecureStorageService.initialize();
      
      // Initialize system configuration
      await ConfigService.initialize();
      
      // Initialize audit service
      await AuditSecurityService.initialize();
      
      // Initialize NIN service
      await NINValidationService.initialize();
      
      // Initialize blockchain
      await BlockchainService.initializeBlockchain();
      
      // Initialize biometric service
      await BiometricSecurityService.initializeModel();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsInitialized(true); // Continue even if initialization fails
    }
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
  };

  const handleVoterLoginSuccess = (nin: string) => {
    setVoterNIN(nin);
    setCurrentView('biometric-login');
  };

  const handleVoterRegisterSuccess = (data: any) => {
    setRegistrationData(data);
    setCurrentView('biometric-register');
  };

  const handleBiometricSuccess = () => {
    if (currentView === 'biometric-login') {
      setCurrentView('voting-dashboard');
    } else if (currentView === 'biometric-register') {
      // Complete registration with biometric data
      completeVoterRegistration();
    }
  };

  const completeVoterRegistration = async () => {
    if (!registrationData) return;

    try {
      // Generate fake biometric embedding for demo
      const fakeEmbedding = Array.from({length: 128}, () => Math.random());
      
      const result = await VoterDatabaseService.registerVoter({
        ...registrationData,
        dateOfBirth: new Date(registrationData.dateOfBirth),
        faceEmbedding: fakeEmbedding,
        biometricQuality: 0.95
      });

      if (result.success) {
        alert('Registration completed successfully! You can now login.');
        setCurrentView('voter-login');
      } else {
        alert(`Registration failed: ${result.error}`);
        setCurrentView('voter-register');
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      alert('Registration failed. Please try again.');
      setCurrentView('voter-register');
    } finally {
      setRegistrationData(null);
    }
  };
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Initializing Nigeria E-Voting System
          </h2>
          <p className="text-gray-600">
            Setting up secure blockchain, biometric services, and audit systems...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authProvider}>
      <div className="App">
        {currentView === 'landing' ? (
          <LandingPage onNavigate={handleNavigate} />
        ) : currentView === 'voter-portal' ? (
          <VoterPortal onNavigate={handleNavigate} />
        ) : currentView === 'voter-login' ? (
          <VoterLogin onNavigate={handleNavigate} onLoginSuccess={handleVoterLoginSuccess} />
        ) : currentView === 'voter-register' ? (
          <VoterRegister onNavigate={handleNavigate} onRegisterSuccess={handleVoterRegisterSuccess} />
        ) : currentView === 'biometric-login' ? (
          <BiometricVerification 
            onNavigate={handleNavigate} 
            onVerificationSuccess={handleBiometricSuccess}
            nin={voterNIN}
            mode="login"
          />
        ) : currentView === 'biometric-register' ? (
          <BiometricVerification 
            onNavigate={handleNavigate} 
            onVerificationSuccess={handleBiometricSuccess}
            nin={registrationData?.nin || ''}
            mode="register"
          />
        ) : currentView === 'voting-dashboard' ? (
          <VotingDashboard onNavigate={handleNavigate} nin={voterNIN} />
        ) : !authProvider.user && !currentView.startsWith('voter') ? (
          <LoginForm />
        ) : (
          <Layout currentView={currentView} onNavigate={handleNavigate}>
            {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {currentView === 'elections' && <ElectionManagement onNavigate={handleNavigate} />}
            {currentView === 'results' && <ResultsAnalytics onNavigate={handleNavigate} />}
            {currentView === 'voters' && <VoterManagement onNavigate={handleNavigate} />}
            {currentView === 'analytics' && <VoterAnalytics onNavigate={handleNavigate} />}
            {currentView === 'audit' && <AuditDashboard onNavigate={handleNavigate} />}
            {currentView === 'settings' && <SystemSettings onNavigate={handleNavigate} />}
          </Layout>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;