import { SmartContract, Election, Vote, Voter } from '../types';
import { StorageService } from './storageService';

export class SmartContractService {
  private static readonly CONTRACTS_KEY = 'smart_contracts';

  static async initialize(): Promise<void> {
    await this.deployDefaultContracts();
  }

  private static async deployDefaultContracts(): Promise<void> {
    const existingContracts = await this.getAllContracts();
    
    if (existingContracts.length === 0) {
      await this.deployContract({
        name: 'Election Validation Rules',
        type: 'election_rules',
        code: `
          function validateElectionRules(election) {
            const rules = {
              minCandidates: 2,
              maxDurationDays: 365,
              requiresVerification: true
            };
            
            if (!election.candidates || election.candidates.length < rules.minCandidates) {
              return { valid: false, reason: 'Insufficient candidates' };
            }
            
            const duration = (new Date(election.endDate) - new Date(election.startDate)) / (1000 * 60 * 60 * 24);
            if (duration > rules.maxDurationDays || duration < 1) {
              return { valid: false, reason: 'Invalid election duration' };
            }
            
            return { valid: true };
          }
        `,
        deployedBy: 'system',
        parameters: {
          minCandidates: 2,
          maxDurationDays: 365
        }
      });

      await this.deployContract({
        name: 'Vote Validation',
        type: 'voting_validation',
        code: `
          function validateVote(vote, voter, election) {
            if (!voter.isVerified || !voter.isActive) {
              return { valid: false, reason: 'Voter not verified or inactive' };
            }
            
            if (voter.hasVoted[election.id]) {
              return { valid: false, reason: 'Voter has already voted in this election' };
            }
            
            if (!voter.eligibleElections.includes(election.id)) {
              return { valid: false, reason: 'Voter not eligible for this election' };
            }
            
            const now = new Date();
            if (now < new Date(election.startDate) || now > new Date(election.endDate)) {
              return { valid: false, reason: 'Election not active' };
            }
            
            return { valid: true };
          }
        `,
        deployedBy: 'system',
        parameters: {}
      });

      await this.deployContract({
        name: 'Result Calculation',
        type: 'result_calculation',
        code: `
          function calculateResults(votes, candidates) {
            const voteCounts = {};
            candidates.forEach(c => voteCounts[c.id] = 0);
            
            votes.forEach(vote => {
              if (voteCounts[vote.candidateId] !== undefined) {
                voteCounts[vote.candidateId]++;
              }
            });
            
            const totalVotes = votes.length;
            const results = candidates.map(candidate => ({
              candidateId: candidate.id,
              candidateName: candidate.name,
              party: candidate.party,
              voteCount: voteCounts[candidate.id],
              percentage: totalVotes > 0 ? (voteCounts[candidate.id] / totalVotes) * 100 : 0
            }));
            
            results.sort((a, b) => b.voteCount - a.voteCount);
            
            return {
              results,
              totalVotes,
              winner: results[0]
            };
          }
        `,
        deployedBy: 'system',
        parameters: {}
      });
    }
  }

  static async deployContract(contractData: Omit<SmartContract, 'id' | 'deployedAt' | 'executionCount' | 'isActive'>): Promise<SmartContract> {
    const contract: SmartContract = {
      ...contractData,
      id: crypto.randomUUID(),
      deployedAt: new Date(),
      executionCount: 0,
      isActive: true
    };

    const contracts = await this.getAllContracts();
    contracts.push(contract);
    await StorageService.setItem(this.CONTRACTS_KEY, contracts);

    return contract;
  }

  static async executeContract(contractId: string, ...args: any[]): Promise<any> {
    const contract = await this.getContract(contractId);
    
    if (!contract) {
      throw new Error('Contract not found');
    }

    if (!contract.isActive) {
      throw new Error('Contract is not active');
    }

    try {
      const func = new Function('return ' + contract.code)();
      const result = func(...args);

      contract.executionCount++;
      contract.lastExecuted = new Date();
      await this.updateContract(contract);

      return result;
    } catch (error) {
      console.error('Smart contract execution error:', error);
      throw new Error('Contract execution failed: ' + (error as Error).message);
    }
  }

  static async executeContractByType(type: SmartContract['type'], ...args: any[]): Promise<any> {
    const contracts = await this.getAllContracts();
    const contract = contracts.find(c => c.type === type && c.isActive);

    if (!contract) {
      throw new Error(`No active contract found for type: ${type}`);
    }

    return this.executeContract(contract.id, ...args);
  }

  static async validateElection(election: Election, candidates: any[]): Promise<{ valid: boolean; reason?: string }> {
    try {
      return await this.executeContractByType('election_rules', { ...election, candidates });
    } catch (error) {
      console.error('Election validation error:', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }

  static async validateVote(vote: Vote, voter: Voter, election: Election): Promise<{ valid: boolean; reason?: string }> {
    try {
      return await this.executeContractByType('voting_validation', vote, voter, election);
    } catch (error) {
      console.error('Vote validation error:', error);
      return { valid: false, reason: 'Validation failed' };
    }
  }

  static async calculateElectionResults(votes: Vote[], candidates: any[]): Promise<any> {
    try {
      return await this.executeContractByType('result_calculation', votes, candidates);
    } catch (error) {
      console.error('Result calculation error:', error);
      throw error;
    }
  }

  static async getContract(contractId: string): Promise<SmartContract | null> {
    const contracts = await this.getAllContracts();
    return contracts.find(c => c.id === contractId) || null;
  }

  static async getAllContracts(): Promise<SmartContract[]> {
    const contracts = await StorageService.getItem(this.CONTRACTS_KEY);
    return contracts || [];
  }

  static async updateContract(contract: SmartContract): Promise<void> {
    const contracts = await this.getAllContracts();
    const index = contracts.findIndex(c => c.id === contract.id);
    
    if (index !== -1) {
      contracts[index] = contract;
      await StorageService.setItem(this.CONTRACTS_KEY, contracts);
    }
  }

  static async deactivateContract(contractId: string): Promise<void> {
    const contract = await this.getContract(contractId);
    
    if (contract) {
      contract.isActive = false;
      await this.updateContract(contract);
    }
  }

  static async getContractMetrics(): Promise<{
    totalContracts: number;
    activeContracts: number;
    totalExecutions: number;
    contractsByType: Record<string, number>;
  }> {
    const contracts = await this.getAllContracts();
    
    const contractsByType: Record<string, number> = {};
    let totalExecutions = 0;

    contracts.forEach(contract => {
      contractsByType[contract.type] = (contractsByType[contract.type] || 0) + 1;
      totalExecutions += contract.executionCount;
    });

    return {
      totalContracts: contracts.length,
      activeContracts: contracts.filter(c => c.isActive).length,
      totalExecutions,
      contractsByType
    };
  }
}
