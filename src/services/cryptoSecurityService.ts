import CryptoJS from 'crypto-js';

export class CryptoSecurityService {
  private static readonly ENCRYPTION_KEY = 'NIGERIA_EVOTING_2024_SECURE_MASTER_KEY';
  private static readonly NIN_SALT = 'NIGERIA_EVOTING_NIN_SALT_2024';
  private static readonly BIOMETRIC_SALT = 'NIGERIA_EVOTING_BIOMETRIC_SALT_2024';
  
  /**
   * Generate secure hash with salt
   */
  static async generateHash(data: string, salt?: string): Promise<string> {
    const saltedData = salt ? data + salt : data;
    return CryptoJS.SHA256(saltedData).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypt sensitive data using AES-256
   */
  static async encryptData(data: string): Promise<string> {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt sensitive data
   */
  static async decryptData(encryptedData: string): Promise<string> {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Hash NIN for secure indexing
   */
  static async hashNIN(nin: string): Promise<string> {
    return await this.generateHash(nin, this.NIN_SALT);
  }

  /**
   * Encrypt NIN for secure storage
   */
  static async encryptNIN(nin: string): Promise<string> {
    return await this.encryptData(nin);
  }

  /**
   * Decrypt NIN from storage
   */
  static async decryptNIN(encryptedNIN: string): Promise<string> {
    return await this.decryptData(encryptedNIN);
  }

  /**
   * Hash biometric data for verification
   */
  static async hashBiometricData(embedding: number[]): Promise<string> {
    const embeddingString = embedding.join(',');
    return await this.generateHash(embeddingString, this.BIOMETRIC_SALT);
  }

  /**
   * Encrypt biometric embedding for secure storage
   */
  static async encryptBiometricData(embedding: number[]): Promise<number[]> {
    const embeddingString = JSON.stringify(embedding);
    const encrypted = await this.encryptData(embeddingString);
    // Convert encrypted string to number array for consistent storage
    return Array.from(encrypted).map(char => char.charCodeAt(0));
  }

  /**
   * Decrypt biometric embedding from storage
   */
  static async decryptBiometricData(encryptedEmbedding: number[]): Promise<number[]> {
    const encryptedString = String.fromCharCode(...encryptedEmbedding);
    const decrypted = await this.decryptData(encryptedString);
    return JSON.parse(decrypted);
  }

  /**
   * Generate secure receipt code
   */
  static async generateReceiptCode(): Promise<string> {
    const timestamp = new Date().getTime().toString();
    const random = Math.random().toString(36).substring(2, 15);
    const combined = timestamp + random;
    return await this.generateHash(combined);
  }

  /**
   * Generate vote signature for blockchain
   */
  static async generateVoteSignature(voteData: any): Promise<string> {
    const dataString = JSON.stringify(voteData);
    return await this.generateHash(dataString);
  }

  /**
   * Generate secure random nonce
   */
  static generateNonce(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return timestamp + random;
  }

  /**
   * Validate data integrity using hash verification
   */
  static async validateDataIntegrity(data: any, expectedHash: string): Promise<boolean> {
    const dataString = JSON.stringify(data);
    const calculatedHash = await this.generateHash(dataString);
    return calculatedHash === expectedHash;
  }

  /**
   * Generate tamper-evident hash chain
   */
  static async generateChainHash(data: any, previousHash: string): Promise<string> {
    const dataString = JSON.stringify(data);
    const combined = dataString + previousHash;
    return await this.generateHash(combined);
  }
}