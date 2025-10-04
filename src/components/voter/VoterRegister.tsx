import React, { useState } from 'react';
import { UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';
import { VoterDatabaseService } from '../../services/voterDatabaseService';
import { NINService } from '../../services/ninService';

interface VoterRegisterProps {
  onNavigate: (view: string) => void;
  onRegisterSuccess: (data: any) => void;
}

export const VoterRegister: React.FC<VoterRegisterProps> = ({ onNavigate, onRegisterSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nin: '',
    firstName: '',
    lastName: '',
    sex: '',
    dateOfBirth: '',
    state: '',
    lga: '',
    ward: '',
    pollingUnit: ''
  });

  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const handleNinValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.nin.length !== 11 || !/^\d{11}$/.test(formData.nin)) {
      setError('Please enter a valid 11-digit NIN');
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if voter already exists
      const existingVoter = await VoterDatabaseService.findVoterByNIN(formData.nin);
      if (existingVoter) {
        setError('A voter with this NIN is already registered. Please use the login option.');
        setIsLoading(false);
        return;
      }

      // Validate NIN with NIMC service
      const ninValidation = await NINService.validateNIN(formData.nin);
      if (!ninValidation.valid) {
        setError(ninValidation.error || 'NIN validation failed');
        setIsLoading(false);
        return;
      }
      
      // Auto-fill data from NIMC if available
      if (ninValidation.voterData) {
        const { firstName, lastName, state, lga } = ninValidation.voterData;
        setFormData(prev => ({
          ...prev,
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(state && { state }),
          ...(lga && { lga })
        }));
      }
      
      setCurrentStep(2);
    } catch (error) {
      setError('NIN validation failed. Please check your NIN and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'sex', 'dateOfBirth', 'state', 'lga', 'ward', 'pollingUnit'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate age (must be 18+)
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 18) {
      setError('You must be at least 18 years old to register');
      return;
    }

    // Proceed to biometric capture
    onRegisterSuccess(formData);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => onNavigate('voter-portal')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portal
          </button>
          <div className="bg-blue-600 p-3 rounded-full w-16 h-16 mx-auto mb-4">
            <UserPlus className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Voter Registration</h1>
          <p className="text-gray-600">
            Create your account to participate in elections
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">NIN Validation</span>
            </div>
            <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Personal Information</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            {currentStep === 1 && (
              <form onSubmit={handleNinValidation} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: NIN Validation</h3>
                  <label htmlFor="nin" className="block text-sm font-medium text-gray-700 mb-2">
                    National Identification Number (NIN)
                  </label>
                  <input
                    id="nin"
                    type="text"
                    required
                    value={formData.nin}
                    onChange={(e) => updateFormData('nin', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your 11-digit NIN"
                    maxLength={11}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll validate your NIN with NIMC database
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
                  disabled={isLoading || formData.nin.length !== 11}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isLoading || formData.nin.length !== 11
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Validating NIN...
                    </div>
                  ) : (
                    'Validate NIN'
                  )}
                </button>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handlePersonalInfo} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Personal Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => updateFormData('firstName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => updateFormData('lastName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                      <select
                        required
                        value={formData.sex}
                        onChange={(e) => updateFormData('sex', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Sex</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <select
                        required
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select State</option>
                        {nigerianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Local Government Area</label>
                      <input
                        type="text"
                        required
                        value={formData.lga}
                        onChange={(e) => updateFormData('lga', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter LGA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ward</label>
                      <input
                        type="text"
                        required
                        value={formData.ward}
                        onChange={(e) => updateFormData('ward', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Ward"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Polling Unit</label>
                      <input
                        type="text"
                        required
                        value={formData.pollingUnit}
                        onChange={(e) => updateFormData('pollingUnit', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Polling Unit"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Continue to Biometric Capture'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => onNavigate('voter-login')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Login here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};