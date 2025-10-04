import CryptoJS from 'crypto-js';

export class CryptoService {
  private static readonly ENCRYPTION_KEY = 'NIGERIA_EVOTING_2024_SECURE_KEY';
  
  static async generateHash(data: string): Promise<string> {
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  static async encryptData(data: string): Promise<string> {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  static async decryptData(encryptedData: string): Promise<string> {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static async generateReceiptCode(): Promise<string> {
    const timestamp = new Date().getTime().toString();
    const random = Math.random().toString(36).substring(2, 15);
    const combined = timestamp + random;
    return await this.generateHash(combined);
  }

  static async generateVoteSignature(voteData: any): Promise<string> {
    const dataString = JSON.stringify(voteData);
    return await this.generateHash(dataString);
  }

  static async hashBiometricData(embedding: number[]): Promise<string> {
    const embeddingString = embedding.join(',');
    return await this.generateHash(embeddingString + this.ENCRYPTION_KEY);
  }

  static generateNonce(): number {
    return Math.floor(Math.random() * 1000000);
  }
}