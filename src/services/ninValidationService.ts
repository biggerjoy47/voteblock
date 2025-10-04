import { CryptoSecurityService } from './cryptoSecurityService';
import { SecureStorageService } from './secureStorageService';
import { NINValidationResult } from '../types/voter';

export class NINValidationService {
  private static readonly NIN_REGISTRY_KEY = 'secure_nin_registry';
  private static readonly NIMC_API_URL = 'https://api.nimc.gov.ng/v1/verify'; // Placeholder URL
  
  /**
   * Initialize NIN service with encrypted registry
   */
  static async initialize(): Promise<void> {
    try {
      const existingRegistry = await SecureStorageService.getItem(this.NIN_REGISTRY_KEY);
      if (!existingRegistry) {
        await this.createSecureNINRegistry();
      }
    } catch (error) {
      console.error('Error initializing NIN validation service:', error);
    }
  }

  /**
   * Validate NIN with enhanced security
   */
  static async validateNIN(nin: string, isOnline: boolean = navigator.onLine): Promise<NINValidationResult> {
    try {
      const validationId = CryptoSecurityService.generateSessionId();
      
      // Validate NIN format
      if (!this.isValidNINFormat(nin)) {
        return { 
          valid: false, 
          error: 'Invalid NIN format. Must be 11 digits.',
          source: 'format_validation',
          validationId
        };
      }

      if (isOnline) {
        return await this.validateNINOnline(nin, validationId);
      } else {
        return await this.validateNINOffline(nin, validationId);
      }
    } catch (error) {
      console.error('Error validating NIN:', error);
      return { 
        valid: false, 
        error: 'NIN validation failed. Please try again.',
        source: 'system_error',
        validationId: CryptoSecurityService.generateSessionId()
      };
    }
  }

  /**
   * Online NIN validation via NIMC API
   */
  private static async validateNINOnline(nin: string, validationId: string): Promise<NINValidationResult> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check against local registry first (fallback)
      const offlineResult = await this.validateNINOffline(nin, validationId);
      if (offlineResult.valid) {
        return { ...offlineResult, source: 'nimc_api' };
      }

      // Simulate NIMC API response for demo
      if (nin.startsWith('123') || nin.startsWith('456') || nin.startsWith('789')) {
        return {
          valid: true,
          voterData: {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-01'),
            sex: 'male',
            state: 'Lagos',
            lga: 'Ikeja'
          },
          source: 'nimc_api',
          validationId
        };
      }

      return { 
        valid: false, 
        error: 'NIN not found in NIMC database.',
        source: 'nimc_api',
        validationId
      };
    } catch (error) {
      console.error('NIMC API error:', error);
      // Fallback to offline validation
      const offlineResult = await this.validateNINOffline(nin, validationId);
      return { ...offlineResult, source: 'offline_fallback' };
    }
  }

  /**
   * Offline NIN validation using encrypted registry
   */
  private static async validateNINOffline(nin: string, validationId: string): Promise<NINValidationResult> {
    try {
      const registry = await SecureStorageService.getItem(this.NIN_REGISTRY_KEY);
      if (!registry) {
        return { 
          valid: false, 
          error: 'NIN registry not available offline.',
          source: 'offline_registry',
          validationId
        };
      }

      const hashedNIN = await CryptoSecurityService.hashNIN(nin);
      const encryptedRecord = registry[hashedNIN];
      
      if (encryptedRecord) {
        // Decrypt voter data
        const decryptedData = await CryptoSecurityService.decryptData(encryptedRecord);
        const voterData = JSON.parse(decryptedData);
        
        return {
          valid: true,
          voterData: {
            firstName: voterData.firstName,
            lastName: voterData.lastName,
            dateOfBirth: new Date(voterData.dateOfBirth),
            sex: voterData.sex,
            state: voterData.state,
            lga: voterData.lga
          },
          source: 'offline_registry',
          validationId
        };
      }

      return { 
        valid: false, 
        error: 'NIN not found in offline registry.',
        source: 'offline_registry',
        validationId
      };
    } catch (error) {
      console.error('Offline NIN validation error:', error);
      return { 
        valid: false, 
        error: 'Offline NIN validation failed.',
        source: 'offline_registry',
        validationId
      };
    }
  }

  /**
   * Validate NIN format (11 digits)
   */
  private static isValidNINFormat(nin: string): boolean {
    return /^\d{11}$/.test(nin);
  }

  /**
   * Create secure NIN registry with encrypted data
   */
  private static async createSecureNINRegistry(): Promise<void> {
    const sampleNINs = [
      { nin: '12345678901', firstName: 'Adebayo', lastName: 'Johnson', dateOfBirth: '1985-03-15', sex: 'male', state: 'Lagos', lga: 'Ikeja' },
      { nin: '12345678902', firstName: 'Fatima', lastName: 'Ibrahim', dateOfBirth: '1990-07-22', sex: 'female', state: 'Kano', lga: 'Nassarawa' },
      { nin: '12345678903', firstName: 'Chinedu', lastName: 'Okafor', dateOfBirth: '1988-11-08', sex: 'male', state: 'Anambra', lga: 'Awka North' },
      { nin: '12345678904', firstName: 'Aisha', lastName: 'Bello', dateOfBirth: '1992-05-12', sex: 'female', state: 'Kaduna', lga: 'Kaduna North' },
      { nin: '12345678905', firstName: 'Emeka', lastName: 'Nwankwo', dateOfBirth: '1987-09-30', sex: 'male', state: 'Imo', lga: 'Owerri North' },
      { nin: '45678901234', firstName: 'Kemi', lastName: 'Adeyemi', dateOfBirth: '1991-02-18', sex: 'female', state: 'Oyo', lga: 'Ibadan North' },
      { nin: '78901234567', firstName: 'Ibrahim', lastName: 'Musa', dateOfBirth: '1989-12-05', sex: 'male', state: 'Sokoto', lga: 'Sokoto North' },
      { nin: '11122233344', firstName: 'Grace', lastName: 'Okoro', dateOfBirth: '1993-08-14', sex: 'female', state: 'Rivers', lga: 'Port Harcourt' },
      { nin: '55566677788', firstName: 'Yusuf', lastName: 'Garba', dateOfBirth: '1986-04-27', sex: 'male', state: 'Katsina', lga: 'Katsina' },
      { nin: '99988877766', firstName: 'Blessing', lastName: 'Eze', dateOfBirth: '1994-10-03', sex: 'female', state: 'Enugu', lga: 'Enugu North' }
    ];

    const registry: { [hashedNIN: string]: string } = {};

    for (const voter of sampleNINs) {
      const hashedNIN = await CryptoSecurityService.hashNIN(voter.nin);
      const encryptedData = await CryptoSecurityService.encryptData(JSON.stringify({
        firstName: voter.firstName,
        lastName: voter.lastName,
        dateOfBirth: voter.dateOfBirth,
        sex: voter.sex,
        state: voter.state,
        lga: voter.lga
      }));
      registry[hashedNIN] = encryptedData;
    }

    await SecureStorageService.setItem(this.NIN_REGISTRY_KEY, registry);
    console.log('Secure NIN registry created with', sampleNINs.length, 'encrypted entries');
  }

  /**
   * Add NIN to registry (admin function)
   */
  static async addNINToRegistry(nin: string, voterData: any): Promise<void> {
    const registry = await SecureStorageService.getItem(this.NIN_REGISTRY_KEY) || {};
    const hashedNIN = await CryptoSecurityService.hashNIN(nin);
    const encryptedData = await CryptoSecurityService.encryptData(JSON.stringify(voterData));
    
    registry[hashedNIN] = encryptedData;
    await SecureStorageService.setItem(this.NIN_REGISTRY_KEY, registry);
  }

  /**
   * Bulk import NINs with encryption
   */
  static async bulkImportNINs(csvData: string): Promise<{ success: number; errors: string[] }> {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const record: any = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index];
        });

        if (this.isValidNINFormat(record.nin)) {
          await this.addNINToRegistry(record.nin, {
            firstName: record.firstName,
            lastName: record.lastName,
            dateOfBirth: record.dateOfBirth,
            sex: record.sex,
            state: record.state,
            lga: record.lga
          });
          success++;
        } else {
          errors.push(`Line ${i + 1}: Invalid NIN format - ${record.nin}`);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error}`);
      }
    }

    return { success, errors };
  }
}