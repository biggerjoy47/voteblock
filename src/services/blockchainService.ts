import { BlockchainBlock } from '../types';
import { CryptoService } from './cryptoService';
import { StorageService } from './storageService';

export class BlockchainService {
  private static readonly BLOCKCHAIN_KEY = 'nigeria_evoting_blockchain';
  
  static async initializeBlockchain(): Promise<void> {
    const existingChain = await StorageService.getItem(this.BLOCKCHAIN_KEY);
    if (!existingChain) {
      const genesisBlock = await this.createGenesisBlock();
      await StorageService.setItem(this.BLOCKCHAIN_KEY, [genesisBlock]);
    }
  }

  private static async createGenesisBlock(): Promise<BlockchainBlock> {
    const genesisData = {
      type: 'genesis',
      message: 'Nigeria E-Voting System Genesis Block',
      timestamp: new Date(),
      authority: 'Independent National Electoral Commission (INEC)'
    };

    const block: BlockchainBlock = {
      index: 0,
      timestamp: new Date(),
      data: genesisData,
      previousHash: '0',
      hash: '',
      nonce: 0
    };

    block.hash = await this.calculateHash(block);
    return block;
  }

  static async addBlock(data: any): Promise<BlockchainBlock> {
    const chain = await this.getBlockchain();
    const previousBlock = chain[chain.length - 1];
    
    const newBlock: BlockchainBlock = {
      index: previousBlock.index + 1,
      timestamp: new Date(),
      data: data,
      previousHash: previousBlock.hash,
      hash: '',
      nonce: 0
    };

    // Simple proof of work (for demonstration)
    newBlock.hash = await this.mineBlock(newBlock);
    
    chain.push(newBlock);
    await StorageService.setItem(this.BLOCKCHAIN_KEY, chain);
    
    return newBlock;
  }

  private static async mineBlock(block: BlockchainBlock): Promise<string> {
    const difficulty = 2; // Number of leading zeros required
    const target = '0'.repeat(difficulty);
    
    while (true) {
      block.nonce = CryptoService.generateNonce();
      const hash = await this.calculateHash(block);
      
      if (hash.substring(0, difficulty) === target) {
        return hash;
      }
    }
  }

  private static async calculateHash(block: BlockchainBlock): Promise<string> {
    const blockString = `${block.index}${block.timestamp}${JSON.stringify(block.data)}${block.previousHash}${block.nonce}`;
    return await CryptoService.generateHash(blockString);
  }

  static async getBlockchain(): Promise<BlockchainBlock[]> {
    const chain = await StorageService.getItem(this.BLOCKCHAIN_KEY);
    return chain || [];
  }

  static async validateBlockchain(): Promise<boolean> {
    const chain = await this.getBlockchain();
    
    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];
      
      // Verify current block hash
      const calculatedHash = await this.calculateHash(currentBlock);
      if (currentBlock.hash !== calculatedHash) {
        return false;
      }
      
      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    
    return true;
  }

  static async getBlockByHash(hash: string): Promise<BlockchainBlock | null> {
    const chain = await this.getBlockchain();
    return chain.find(block => block.hash === hash) || null;
  }
}