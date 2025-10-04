import { Election, Candidate, Vote, ElectionResult, AuditLog } from '../types';
import { StorageService } from './storageService';
import { BlockchainService } from './blockchainService';
import { CryptoService } from './cryptoService';
import { VoterDatabaseService } from './voterDatabaseService';

export class ElectionService {
  static async createElection(electionData: Omit<Election, 'id' | 'createdAt' | 'updatedAt'>): Promise<Election> {
    const election: Election = {
      ...electionData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await StorageService.addToStore('elections', election);
    
    // Auto-assign eligible voters based on election scope
    await this.assignEligibleVoters(election);
    
    // Add to blockchain
    await BlockchainService.addBlock({
      type: 'election_created',
      electionId: election.id,
      title: election.title,
      type: election.type,
      timestamp: new Date()
    });

    // Log audit
    await this.logAudit('election_created', `Election created: ${election.title}`, election.createdBy);

    return election;
  }

  static async updateElection(electionId: string, updates: Partial<Election>, userId: string): Promise<Election> {
    const existingElection = await StorageService.getFromStore('elections', electionId);
    if (!existingElection) {
      throw new Error('Election not found');
    }

    const updatedElection: Election = {
      ...existingElection,
      ...updates,
      updatedAt: new Date()
    };

    await StorageService.updateInStore('elections', updatedElection);

    // If election is being activated, update voter eligibility
    if (updates.status === 'active') {
      await VoterDatabaseService.updateVoterEligibility(
        electionId,
        updatedElection.type,
        updatedElection.state,
        updatedElection.lga
      );
    }
    // Add to blockchain
    await BlockchainService.addBlock({
      type: 'election_updated',
      electionId: electionId,
      updates: updates,
      timestamp: new Date()
    });

    await this.logAudit('election_updated', `Election updated: ${updatedElection.title}`, userId);

    return updatedElection;
  }

  /**
   * Assign eligible voters to election based on geographic scope
   */
  private static async assignEligibleVoters(election: Election): Promise<void> {
    try {
      const allVoters = await StorageService.getAllFromStore('voters');
      let eligibleVoters = allVoters.filter(voter => voter.isActive && voter.isVerified);
      
      // Filter by geographic scope
      if (election.type === 'presidential') {
        // All voters eligible for presidential elections
      } else if (election.state) {
        eligibleVoters = eligibleVoters.filter(voter => voter.state === election.state);
        
        if (election.lga) {
          eligibleVoters = eligibleVoters.filter(voter => voter.lga === election.lga);
        }
      }

      // Update each eligible voter's election list
      for (const voter of eligibleVoters) {
        if (!voter.eligibleElections.includes(election.id)) {
          voter.eligibleElections.push(election.id);
          voter.votingHistory[election.id] = { voted: false };
          await StorageService.updateInStore('voters', voter);
        }
      }

      console.log(`Assigned ${eligibleVoters.length} eligible voters to election: ${election.title}`);
    } catch (error) {
      console.error('Error assigning eligible voters:', error);
    }
  }

  static async getAllElections(): Promise<Election[]> {
    return await StorageService.getAllFromStore('elections');
  }

  static async getElectionById(id: string): Promise<Election | null> {
    return await StorageService.getFromStore('elections', id);
  }

  static async getActiveElections(): Promise<Election[]> {
    const allElections = await this.getAllElections();
    const now = new Date();
    
    return allElections.filter(election => 
      election.status === 'active' &&
      now >= election.startDate &&
      now <= election.endDate
    );
  }

  static async createCandidate(candidateData: Omit<Candidate, 'id'>): Promise<Candidate> {
    const candidate: Candidate = {
      ...candidateData,
      id: crypto.randomUUID()
    };

    await StorageService.addToStore('candidates', candidate);

    // Add to blockchain
    await BlockchainService.addBlock({
      type: 'candidate_added',
      candidateId: candidate.id,
      electionId: candidate.electionId,
      candidateName: candidate.name,
      party: candidate.party,
      timestamp: new Date()
    });

    return candidate;
  }

  static async getCandidatesByElection(electionId: string): Promise<Candidate[]> {
    const allCandidates = await StorageService.getAllFromStore('candidates');
    return allCandidates
      .filter(candidate => candidate.electionId === electionId)
      .sort((a, b) => a.position - b.position);
  }

  static async castVote(voteData: Omit<Vote, 'id' | 'blockchainHash' | 'receiptCode' | 'syncStatus'>): Promise<{ vote: Vote; receiptCode: string }> {
    const receiptCode = await CryptoService.generateReceiptCode();
    
    const vote: Vote = {
      ...voteData,
      id: crypto.randomUUID(),
      receiptCode,
      syncStatus: voteData.isOffline ? 'pending' : 'synced',
      blockchainHash: ''
    };

    // Generate vote signature for blockchain
    const voteSignature = await CryptoService.generateVoteSignature({
      electionId: vote.electionId,
      candidateId: vote.candidateId,
      timestamp: vote.timestamp,
      receiptCode: vote.receiptCode
    });

    // Add to blockchain if online
    if (!vote.isOffline) {
      const block = await BlockchainService.addBlock({
        type: 'vote_cast',
        voteId: vote.id,
        electionId: vote.electionId,
        candidateId: vote.candidateId,
        signature: voteSignature,
        timestamp: vote.timestamp
      });
      vote.blockchainHash = block.hash;
    }

    await StorageService.addToStore('votes', vote);

    return { vote, receiptCode };
  }

  static async getElectionResults(electionId: string): Promise<ElectionResult> {
    const votes = await this.getVotesByElection(electionId);
    const candidates = await this.getCandidatesByElection(electionId);
    
    const candidateVotes: { [candidateId: string]: number } = {};
    
    // Count votes
    votes.forEach(vote => {
      candidateVotes[vote.candidateId] = (candidateVotes[vote.candidateId] || 0) + 1;
    });

    const totalVotes = votes.length;
    
    const candidateResults = candidates.map(candidate => ({
      candidateId: candidate.id,
      candidateName: candidate.name,
      party: candidate.party,
      voteCount: candidateVotes[candidate.id] || 0,
      percentage: totalVotes > 0 ? ((candidateVotes[candidate.id] || 0) / totalVotes) * 100 : 0
    }));

    // Sort by vote count descending
    candidateResults.sort((a, b) => b.voteCount - a.voteCount);

    return {
      electionId,
      candidateResults,
      totalVotes,
      turnoutRate: 0, // Would be calculated based on registered voters
      lastUpdated: new Date()
    };
  }

  private static async getVotesByElection(electionId: string): Promise<Vote[]> {
    const allVotes = await StorageService.getAllFromStore('votes');
    return allVotes.filter(vote => vote.electionId === electionId);
  }

  static async syncOfflineVotes(): Promise<number> {
    const allVotes = await StorageService.getAllFromStore('votes');
    const offlineVotes = allVotes.filter(vote => vote.syncStatus === 'pending');
    
    let syncedCount = 0;
    
    for (const vote of offlineVotes) {
      try {
        const voteSignature = await CryptoService.generateVoteSignature({
          electionId: vote.electionId,
          candidateId: vote.candidateId,
          timestamp: vote.timestamp,
          receiptCode: vote.receiptCode
        });

        const block = await BlockchainService.addBlock({
          type: 'vote_sync',
          voteId: vote.id,
          electionId: vote.electionId,
          candidateId: vote.candidateId,
          signature: voteSignature,
          originalTimestamp: vote.timestamp,
          syncTimestamp: new Date()
        });

        vote.blockchainHash = block.hash;
        vote.syncStatus = 'synced';
        
        await StorageService.updateInStore('votes', vote);
        syncedCount++;
      } catch (error) {
        console.error('Error syncing vote:', error);
        vote.syncStatus = 'failed';
        await StorageService.updateInStore('votes', vote);
      }
    }

    return syncedCount;
  }

  private static async logAudit(action: string, details: string, userId: string): Promise<void> {
    const auditLog: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      details,
      timestamp: new Date()
    };

    await StorageService.addToStore('auditLogs', auditLog);
  }

  static async verifyVoteReceipt(receiptCode: string): Promise<{ valid: boolean; voteDetails?: any }> {
    const allVotes = await StorageService.getAllFromStore('votes');
    const vote = allVotes.find(v => v.receiptCode === receiptCode);
    
    if (!vote) {
      return { valid: false };
    }

    // Verify blockchain integrity if vote is synced
    if (vote.syncStatus === 'synced' && vote.blockchainHash) {
      const block = await BlockchainService.getBlockByHash(vote.blockchainHash);
      if (!block) {
        return { valid: false };
      }
    }

    const election = await this.getElectionById(vote.electionId);
    const candidates = await this.getCandidatesByElection(vote.electionId);
    const candidate = candidates.find(c => c.id === vote.candidateId);

    return {
      valid: true,
      voteDetails: {
        electionTitle: election?.title,
        candidateName: candidate?.name,
        party: candidate?.party,
        timestamp: vote.timestamp,
        receiptCode: vote.receiptCode,
        blockchainHash: vote.blockchainHash,
        syncStatus: vote.syncStatus
      }
    };
  }
}