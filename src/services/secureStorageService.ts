import { Voter } from '../types/voter';
import { CryptoSecurityService } from './cryptoSecurityService';

export class SecureStorageService {
  private static dbName = 'SecureNigeriaEVotingDB';
  private static version = 2;
  private static db: IDBDatabase | null = null;

  static async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create secure object stores with encryption
        if (!db.objectStoreNames.contains('voters')) {
          const voterStore = db.createObjectStore('voters', { keyPath: 'id' });
          voterStore.createIndex('ninHash', 'ninHash', { unique: true });
          voterStore.createIndex('registrationDate', 'registrationDate');
        }
        
        if (!db.objectStoreNames.contains('elections')) {
          db.createObjectStore('elections', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('candidates')) {
          db.createObjectStore('candidates', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('votes')) {
          const voteStore = db.createObjectStore('votes', { keyPath: 'id' });
          voteStore.createIndex('electionId', 'electionId');
          voteStore.createIndex('timestamp', 'timestamp');
        }
        
        if (!db.objectStoreNames.contains('auditLogs')) {
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp');
          auditStore.createIndex('eventType', 'eventType');
        }
        
        if (!db.objectStoreNames.contains('system')) {
          db.createObjectStore('system');
        }
      };
    });
  }

  /**
   * Store voter with encryption and hash chaining
   */
  static async storeVoter(voter: Voter): Promise<void> {
    if (!this.db) await this.initialize();
    
    // Create encrypted storage version
    const encryptedVoter = {
      ...voter,
      nin: await CryptoSecurityService.encryptNIN(voter.nin),
      faceEmbedding: await CryptoSecurityService.encryptBiometricData(voter.faceEmbedding),
      ninHash: await CryptoSecurityService.hashNIN(voter.nin) // For indexing
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['voters'], 'readwrite');
      const store = transaction.objectStore('voters');
      const request = store.add(encryptedVoter);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Find voter by NIN (using encrypted hash lookup)
   */
  static async findVoterByNIN(nin: string): Promise<Voter | null> {
    if (!this.db) await this.initialize();
    
    const ninHash = await CryptoSecurityService.hashNIN(nin);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['voters'], 'readonly');
      const store = transaction.objectStore('voters');
      const index = store.index('ninHash');
      const request = index.get(ninHash);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        if (request.result) {
          // Decrypt sensitive data
          const encryptedVoter = request.result;
          const decryptedVoter: Voter = {
            ...encryptedVoter,
            nin: await CryptoSecurityService.decryptNIN(encryptedVoter.nin),
            faceEmbedding: await CryptoSecurityService.decryptBiometricData(encryptedVoter.faceEmbedding)
          };
          resolve(decryptedVoter);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Update voter record
   */
  static async updateVoter(voter: Voter): Promise<void> {
    if (!this.db) await this.initialize();
    
    // Re-encrypt for storage
    const encryptedVoter = {
      ...voter,
      nin: await CryptoSecurityService.encryptNIN(voter.nin),
      faceEmbedding: await CryptoSecurityService.encryptBiometricData(voter.faceEmbedding),
      ninHash: await CryptoSecurityService.hashNIN(voter.nin)
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['voters'], 'readwrite');
      const store = transaction.objectStore('voters');
      const request = store.put(encryptedVoter);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get last voter for hash chaining
   */
  static async getLastVoter(): Promise<Voter | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['voters'], 'readonly');
      const store = transaction.objectStore('voters');
      const index = store.index('registrationDate');
      const request = index.openCursor(null, 'prev');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        if (request.result) {
          const encryptedVoter = request.result.value;
          const decryptedVoter: Voter = {
            ...encryptedVoter,
            nin: await CryptoSecurityService.decryptNIN(encryptedVoter.nin),
            faceEmbedding: await CryptoSecurityService.decryptBiometricData(encryptedVoter.faceEmbedding)
          };
          resolve(decryptedVoter);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Generic secure storage methods
   */
  static async setItem(key: string, value: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['system'], 'readwrite');
      const store = transaction.objectStore('system');
      const request = store.put(value, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  static async getItem(key: string): Promise<any> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['system'], 'readonly');
      const store = transaction.objectStore('system');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  static async addToStore(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  static async getAllFromStore(storeName: string): Promise<any[]> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  static async updateInStore(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  static async deleteFromStore(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}