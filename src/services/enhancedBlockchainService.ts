import { BlockchainBlock, BlockchainNode, ConsensusState, BlockchainTransaction } from '../types';
import { CryptoService } from './cryptoService';
import { StorageService } from './storageService';
import { TransactionManager } from './transactionManager';

export class EnhancedBlockchainService {
  private static readonly BLOCKCHAIN_KEY = 'nigeria_evoting_blockchain_v2';
  private static readonly NODES_KEY = 'blockchain_nodes';
  private static readonly CONSENSUS_KEY = 'consensus_state';
  private static readonly NETWORK_ID = 'nigeria-evoting-mainnet';

  static async initializeBlockchain(): Promise<void> {
    const existingChain = await StorageService.getItem(this.BLOCKCHAIN_KEY);
    
    if (!existingChain) {
      const genesisBlock = await this.createGenesisBlock();
      await StorageService.setItem(this.BLOCKCHAIN_KEY, [genesisBlock]);
    }

    await this.initializeNetwork();
    await this.initializeConsensus();
  }

  private static async initializeNetwork(): Promise<void> {
    const nodes = await this.getNodes();
    
    if (nodes.length === 0) {
      const validatorNodes = [
        this.createNode('validator', 'INEC-Primary-Validator'),
        this.createNode('validator', 'INEC-Secondary-Validator'),
        this.createNode('validator', 'INEC-Tertiary-Validator'),
        this.createNode('peer', 'Regional-Node-Lagos'),
        this.createNode('peer', 'Regional-Node-Abuja'),
        this.createNode('peer', 'Regional-Node-Kano')
      ];

      await StorageService.setItem(this.NODES_KEY, validatorNodes);
    }
  }

  private static createNode(type: 'validator' | 'peer' | 'light', address: string): BlockchainNode {
    return {
      id: crypto.randomUUID(),
      address,
      type,
      status: 'active',
      lastSeen: new Date(),
      blocksValidated: 0,
      reputation: 100,
      stake: type === 'validator' ? 1000000 : 0
    };
  }

  private static async initializeConsensus(): Promise<void> {
    const consensus = await StorageService.getItem(this.CONSENSUS_KEY);
    
    if (!consensus) {
      const validators = (await this.getNodes()).filter(n => n.type === 'validator' && n.status === 'active');
      
      const initialConsensus: ConsensusState = {
        mechanism: 'PoA',
        currentValidator: validators[0]?.id,
        validators: validators.map(v => v.id),
        epoch: 0,
        blockTime: 3000,
        difficulty: 3
      };

      await StorageService.setItem(this.CONSENSUS_KEY, initialConsensus);
    }
  }

  private static async createGenesisBlock(): Promise<BlockchainBlock> {
    const genesisData = {
      type: 'genesis',
      message: 'Nigeria E-Voting System - Enhanced Blockchain Genesis Block',
      timestamp: new Date(),
      authority: 'Independent National Electoral Commission (INEC)',
      networkId: this.NETWORK_ID,
      features: ['PoA Consensus', 'Smart Contracts', 'Real-time Verification']
    };

    const block: BlockchainBlock = {
      index: 0,
      timestamp: new Date(),
      data: genesisData,
      previousHash: '0',
      hash: '',
      nonce: 0,
      validator: 'system',
      signature: '',
      transactions: [],
      merkleRoot: await this.calculateMerkleRoot([]),
      gasUsed: 0,
      difficulty: 0
    };

    block.hash = await this.calculateHash(block);
    block.signature = await this.signBlock(block);
    
    return block;
  }

  static async addBlock(transactions: BlockchainTransaction[]): Promise<BlockchainBlock> {
    const chain = await this.getBlockchain();
    const previousBlock = chain[chain.length - 1];
    const consensus = await this.getConsensusState();

    const newBlock: BlockchainBlock = {
      index: previousBlock.index + 1,
      timestamp: new Date(),
      data: {
        networkId: this.NETWORK_ID,
        transactionCount: transactions.length
      },
      previousHash: previousBlock.hash,
      hash: '',
      nonce: 0,
      validator: consensus.currentValidator || 'system',
      signature: '',
      transactions,
      merkleRoot: await this.calculateMerkleRoot(transactions),
      gasUsed: 0,
      difficulty: consensus.difficulty
    };

    const totalGas = transactions.reduce((sum, tx) => sum + (tx.gasUsed || 0), 0);
    newBlock.gasUsed = totalGas;

    if (consensus.mechanism === 'PoW') {
      newBlock.hash = await this.mineBlockPoW(newBlock, consensus.difficulty);
    } else {
      newBlock.hash = await this.calculateHash(newBlock);
    }

    newBlock.signature = await this.signBlock(newBlock);

    await this.validateBlock(newBlock, previousBlock);

    chain.push(newBlock);
    await StorageService.setItem(this.BLOCKCHAIN_KEY, chain);

    await this.updateValidatorStats(newBlock.validator || 'system');
    await this.rotateValidator();

    for (const transaction of transactions) {
      await TransactionManager.markTransactionConfirmed(
        transaction.id,
        newBlock.index,
        transaction.gasUsed || 0
      );
    }

    return newBlock;
  }

  private static async mineBlockPoW(block: BlockchainBlock, difficulty: number): Promise<string> {
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
    const blockString = `${block.index}${block.timestamp}${JSON.stringify(block.data)}${block.previousHash}${block.nonce}${block.merkleRoot}`;
    return await CryptoService.generateHash(blockString);
  }

  private static async calculateMerkleRoot(transactions: BlockchainTransaction[]): Promise<string> {
    if (transactions.length === 0) {
      return await CryptoService.generateHash('empty');
    }

    let hashes = await Promise.all(
      transactions.map(tx => CryptoService.generateHash(JSON.stringify(tx)))
    );

    while (hashes.length > 1) {
      const newHashes: string[] = [];
      
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          const combined = await CryptoService.generateHash(hashes[i] + hashes[i + 1]);
          newHashes.push(combined);
        } else {
          newHashes.push(hashes[i]);
        }
      }
      
      hashes = newHashes;
    }

    return hashes[0];
  }

  private static async signBlock(block: BlockchainBlock): Promise<string> {
    const blockData = `${block.index}${block.hash}${block.validator}`;
    return await CryptoService.generateHash(blockData);
  }

  private static async validateBlock(newBlock: BlockchainBlock, previousBlock: BlockchainBlock): Promise<void> {
    if (newBlock.index !== previousBlock.index + 1) {
      throw new Error('Invalid block index');
    }

    if (newBlock.previousHash !== previousBlock.hash) {
      throw new Error('Invalid previous hash');
    }

    const calculatedHash = await this.calculateHash(newBlock);
    if (newBlock.hash !== calculatedHash) {
      throw new Error('Invalid block hash');
    }

    if (newBlock.transactions) {
      const calculatedMerkleRoot = await this.calculateMerkleRoot(newBlock.transactions);
      if (newBlock.merkleRoot !== calculatedMerkleRoot) {
        throw new Error('Invalid merkle root');
      }
    }
  }

  static async validateBlockchain(): Promise<boolean> {
    const chain = await this.getBlockchain();
    
    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];
      
      try {
        await this.validateBlock(currentBlock, previousBlock);
      } catch (error) {
        console.error('Blockchain validation failed at block', i, error);
        return false;
      }
    }
    
    return true;
  }

  static async getBlockchain(): Promise<BlockchainBlock[]> {
    const chain = await StorageService.getItem(this.BLOCKCHAIN_KEY);
    return chain || [];
  }

  static async getBlockByHash(hash: string): Promise<BlockchainBlock | null> {
    const chain = await this.getBlockchain();
    return chain.find(block => block.hash === hash) || null;
  }

  static async getBlockByIndex(index: number): Promise<BlockchainBlock | null> {
    const chain = await this.getBlockchain();
    return chain.find(block => block.index === index) || null;
  }

  static async getNodes(): Promise<BlockchainNode[]> {
    const nodes = await StorageService.getItem(this.NODES_KEY);
    return nodes || [];
  }

  static async getActiveValidators(): Promise<BlockchainNode[]> {
    const nodes = await this.getNodes();
    return nodes.filter(n => n.type === 'validator' && n.status === 'active');
  }

  private static async updateValidatorStats(validatorId: string): Promise<void> {
    const nodes = await this.getNodes();
    const validator = nodes.find(n => n.id === validatorId);
    
    if (validator) {
      validator.blocksValidated++;
      validator.lastSeen = new Date();
      validator.reputation = Math.min(100, validator.reputation + 1);
      await StorageService.setItem(this.NODES_KEY, nodes);
    }
  }

  private static async rotateValidator(): Promise<void> {
    const consensus = await this.getConsensusState();
    const validators = await this.getActiveValidators();
    
    if (validators.length === 0) return;

    const currentIndex = validators.findIndex(v => v.id === consensus.currentValidator);
    const nextIndex = (currentIndex + 1) % validators.length;
    
    consensus.currentValidator = validators[nextIndex].id;
    consensus.epoch++;
    
    await StorageService.setItem(this.CONSENSUS_KEY, consensus);
  }

  static async getConsensusState(): Promise<ConsensusState> {
    const consensus = await StorageService.getItem(this.CONSENSUS_KEY);
    return consensus || {
      mechanism: 'PoA',
      validators: [],
      epoch: 0,
      blockTime: 3000,
      difficulty: 3
    };
  }

  static async updateConsensus(updates: Partial<ConsensusState>): Promise<void> {
    const consensus = await this.getConsensusState();
    const updated = { ...consensus, ...updates };
    await StorageService.setItem(this.CONSENSUS_KEY, updated);
  }

  static async getNetworkStatus(): Promise<{
    totalNodes: number;
    activeNodes: number;
    validators: number;
    networkHealth: 'healthy' | 'degraded' | 'critical';
  }> {
    const nodes = await this.getNodes();
    const activeNodes = nodes.filter(n => n.status === 'active');
    const validators = nodes.filter(n => n.type === 'validator' && n.status === 'active');

    let networkHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (validators.length < 2) {
      networkHealth = 'critical';
    } else if (activeNodes.length < nodes.length * 0.5) {
      networkHealth = 'degraded';
    }

    return {
      totalNodes: nodes.length,
      activeNodes: activeNodes.length,
      validators: validators.length,
      networkHealth
    };
  }

  static async processTransactionBatch(): Promise<BlockchainBlock | null> {
    const batch = await TransactionManager.getBatchForProcessing();
    
    if (batch.length === 0) {
      return null;
    }

    return await this.addBlock(batch);
  }

  static async verifyTransaction(transactionId: string): Promise<{
    verified: boolean;
    blockIndex?: number;
    confirmations?: number;
    status?: string;
  }> {
    const transaction = await TransactionManager.getTransactionById(transactionId);
    
    if (!transaction) {
      return { verified: false, status: 'not_found' };
    }

    if (transaction.status === 'pending') {
      return { verified: false, status: 'pending' };
    }

    if (transaction.status === 'failed') {
      return { verified: false, status: 'failed' };
    }

    if (transaction.blockIndex !== undefined) {
      const chain = await this.getBlockchain();
      const confirmations = chain.length - transaction.blockIndex;
      
      return {
        verified: true,
        blockIndex: transaction.blockIndex,
        confirmations,
        status: 'confirmed'
      };
    }

    return { verified: false, status: 'unknown' };
  }
}
