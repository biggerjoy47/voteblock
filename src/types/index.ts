export interface User {
  id: string;
  email: string;
  role: 'admin' | 'election_officer' | 'observer';
  name: string;
  state?: string;
  lga?: string;
  createdAt: Date;
}

export interface Election {
  id: string;
  title: string;
  type: 'presidential' | 'gubernatorial' | 'national_assembly' | 'state_assembly' | 'local_government';
  description: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  state?: string;
  lga?: string;
  constituency?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  electionId: string;
  name: string;
  party: string;
  position: number;
  photoUrl?: string;
  biography?: string;
  manifesto?: string;
}

export interface Vote {
  id: string;
  electionId: string;
  candidateId: string;
  voterId: string;
  timestamp: Date;
  blockchainHash: string;
  receiptCode: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
}

export interface Voter {
  id: string;
  nin: string; // National Identification Number (required)
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female';
  email?: string;
  phone?: string;
  state: string;
  lga: string;
  ward: string;
  pollingUnit: string;
  biometricHash: string; // Encrypted facial embedding
  faceEmbedding: number[]; // Encrypted face embedding for comparison
  registrationDate: Date;
  isVerified: boolean;
  isActive: boolean; // Can be suspended/revoked
  eligibleElections: string[]; // Election IDs voter can participate in
  hasVoted: { [electionId: string]: boolean };
  lastLoginAttempt?: Date;
  loginAttempts: number;
  biometricAttempts: number;
  lastBiometricAttempt?: Date;
}

export interface BiometricData {
  faceEmbedding: number[];
  confidence: number;
  livenessScore: number;
  livenessTests: {
    blinkDetected: boolean;
    headMovement: boolean;
    textureAnalysis: boolean;
    eyeBlinkCount: number;
    eyeAspectRatio: number[];
    blinkDuration: number;
  };
  timestamp: Date;
}

export interface BlockchainBlock {
  index: number;
  timestamp: Date;
  data: any;
  previousHash: string;
  hash: string;
  nonce: number;
  validator?: string;
  signature?: string;
  transactions?: BlockchainTransaction[];
  merkleRoot?: string;
  gasUsed?: number;
  difficulty?: number;
}

export interface BlockchainTransaction {
  id: string;
  type: 'vote' | 'election_create' | 'election_update' | 'voter_register' | 'smart_contract';
  from: string;
  to?: string;
  data: any;
  timestamp: Date;
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockIndex?: number;
  gasLimit?: number;
  gasUsed?: number;
}

export interface BlockchainNode {
  id: string;
  address: string;
  type: 'validator' | 'peer' | 'light';
  status: 'active' | 'inactive' | 'syncing';
  lastSeen: Date;
  blocksValidated: number;
  reputation: number;
  stake?: number;
}

export interface SmartContract {
  id: string;
  name: string;
  type: 'election_rules' | 'voting_validation' | 'result_calculation';
  code: string;
  deployedBy: string;
  deployedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  isActive: boolean;
  parameters?: any;
}

export interface ConsensusState {
  mechanism: 'PoA' | 'PoW' | 'PoS';
  currentValidator?: string;
  validators: string[];
  epoch: number;
  blockTime: number;
  difficulty: number;
}

export interface BlockchainMetrics {
  totalBlocks: number;
  totalTransactions: number;
  averageBlockTime: number;
  transactionsPerSecond: number;
  networkHashRate: number;
  activeNodes: number;
  consensusHealth: 'healthy' | 'degraded' | 'critical';
  chainValidity: boolean;
  lastBlockTime: Date;
  pendingTransactions: number;
}

export interface ElectionResult {
  electionId: string;
  candidateResults: {
    candidateId: string;
    candidateName: string;
    party: string;
    voteCount: number;
    percentage: number;
  }[];
  totalVotes: number;
  turnoutRate: number;
  lastUpdated: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  voterNin?: string; // For voter-related actions
  action: string;
  details: string;
  result: 'success' | 'failure' | 'pending';
  metadata?: any; // Additional context data
  timestamp: Date;
  ipAddress?: string;
  sessionId?: string;
  previousHash?: string; // For hash-chaining
  hash?: string; // Current entry hash
}

export interface SystemStats {
  totalVoters: number;
  activeVoters: number;
  suspendedVoters: number;
  totalVotes: number;
  onlineVotes: number;
  offlineVotes: number;
  syncPendingVotes: number;
  biometricSuccessRate: number;
  livenessSuccessRate: number;
  activeElections: number;
  blockchainSyncStatus: 'healthy' | 'degraded' | 'offline';
  nodeCount: number;
  lastSyncTime: Date;
}

export interface SystemConfig {
  id: string;
  encryption: {
    algorithm: string;
    keyRotationDays: number;
    lastRotation: Date;
  };
  blockchain: {
    networkId: string;
    peerNodes: string[];
    channelName: string;
    consensusType: 'raft' | 'pbft';
  };
  authentication: {
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
      maxAge: number;
    };
    twoFactorEnabled: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
  };
  biometric: {
    confidenceThreshold: number;
    livenessThreshold: number;
    requireLiveness: boolean;
    antiSpoofingEnabled: boolean;
  };
  election: {
    maxVotersPerElection: number;
    allowConcurrentElections: boolean;
    voteReceiptFormat: 'qr' | 'text' | 'both';
  };
  audit: {
    retentionDays: number;
    hashChainEnabled: boolean;
    exportFormat: 'json' | 'csv' | 'pdf';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NINValidationResult {
  valid: boolean;
  voterData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    state: string;
    lga: string;
  };
  error?: string;
}