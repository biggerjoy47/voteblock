import { CryptoService } from './cryptoService';
import { StorageService } from './storageService';
import { NINValidationResult } from '../types';

export class NINService {
  private static readonly NIN_REGISTRY_KEY = 'nin_registry';
  private static readonly NIMC_API_URL = 'https://api.nimc.gov.ng/v1/verify'; // Placeholder URL
  
  /**
   * Initialize NIN service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize empty registry if not exists
      const existingRegistry = await StorageService.getItem(this.NIN_REGISTRY_KEY);
      if (!existingRegistry) {
        await StorageService.setItem(this.NIN_REGISTRY_KEY, {});
      }
    } catch (error) {
      console.error('Error initializing NIN service:', error);
    }
  }

  /**
   * Validate NIN online via NIMC API or offline via local registry
   */
  static async validateNIN(nin: string, isOnline: boolean = navigator.onLine): Promise<NINValidationResult> {
    try {
      // Validate NIN format (11 digits)
      if (!this.isValidNINFormat(nin)) {
        return { valid: false, error: 'Invalid NIN format. Must be 11 digits.' };
      }

      if (isOnline) {
        return await this.validateNINOnline(nin);
      } else {
        return await this.validateNINOffline(nin);
      }
    } catch (error) {
      console.error('Error validating NIN:', error);
      return { valid: false, error: 'NIN validation failed. Please try again.' };
    }
  }

  /**
   * Online NIN validation via NIMC API
   */
  private static async validateNINOnline(nin: string): Promise<NINValidationResult> {
    try {
      // In a real implementation, this would call the actual NIMC API
      // For demo purposes, we'll simulate the API call
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For development/testing, accept any valid NIN format
      if (this.isValidNINFormat(nin)) {
        return {
          valid: true,
          voterData: undefined // User will need to enter their details manually
        };
      }

      return { valid: false, error: 'NIN not found in NIMC database.' };
    } catch (error) {
      console.error('NIMC API error:', error);
      // Fallback to offline validation
      return await this.validateNINOffline(nin);
    }
  }

  /**
   * Offline NIN validation using preloaded encrypted registry
   */
  private static async validateNINOffline(nin: string): Promise<NINValidationResult> {
    try {
      const registry = await StorageService.getItem(this.NIN_REGISTRY_KEY);
      if (!registry) {
        // Initialize empty registry
        await StorageService.setItem(this.NIN_REGISTRY_KEY, {});
      }

      const hashedNIN = await this.hashNIN(nin);
      const voterRecord = registry?.[hashedNIN];
      
      if (voterRecord) {
        // Decrypt voter data
        const decryptedData = await CryptoService.decryptData(voterRecord);
        const voterData = JSON.parse(decryptedData);
        
        return {
          valid: true,
          voterData: {
            firstName: voterData.firstName,
            lastName: voterData.lastName,
            dateOfBirth: new Date(voterData.dateOfBirth),
            state: voterData.state,
            lga: voterData.lga
          }
        };
      }

      // Accept new NINs if they have valid format
      if (this.isValidNINFormat(nin)) {
        return {
          valid: true,
          voterData: undefined
        };
      }
      
      return { valid: false, error: 'Invalid NIN format.' };
    } catch (error) {
      console.error('Offline NIN validation error:', error);
      return { valid: false, error: 'Offline NIN validation failed.' };
    }
  }

  /**
   * Hash NIN for secure storage and lookup
   */
  static async hashNIN(nin: string): Promise<string> {
    const salt = 'NIGERIA_EVOTING_NIN_SALT_2024';
    return await CryptoService.generateHash(nin + salt);
  }

  /**
   * Encrypt NIN for secure storage
   */
  static async encryptNIN(nin: string): Promise<string> {
    return await CryptoService.encryptData(nin);
  }

  /**
   * Validate NIN format (11 digits)
   */
  private static isValidNINFormat(nin: string): boolean {
    return /^\d{11}$/.test(nin);
  }



  /**
   * Add NIN to registry (admin function)
   */
  static async addNINToRegistry(nin: string, voterData: any): Promise<void> {
    const registry = await StorageService.getItem(this.NIN_REGISTRY_KEY) || {};
    const hashedNIN = await this.hashNIN(nin);
    const encryptedData = await CryptoService.encryptData(JSON.stringify(voterData));
    
    registry[hashedNIN] = encryptedData;
    await StorageService.setItem(this.NIN_REGISTRY_KEY, registry);
  }

  /**
   * Bulk import NINs from CSV data
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