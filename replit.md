# Nigeria E-Voting System - Replit Setup

## Overview
This is a blockchain-enabled electronic voting platform for Nigeria, featuring biometric authentication, NIN (National Identification Number) validation, secure vote storage, and an advanced high-level blockchain system with smart contracts and real-time monitoring.

## Architecture
- **Frontend Only**: React + TypeScript + Vite
- **Storage**: Browser-based IndexedDB for local data persistence
- **Blockchain**: Enhanced distributed blockchain with PoA consensus, smart contracts, and transaction management
- **Key Technologies**:
  - React 18.3.1
  - TypeScript 5.5.3
  - Vite 5.4.2
  - TensorFlow.js for biometric verification
  - Chart.js for analytics
  - Tailwind CSS for styling

## Project Structure
- `src/components/admin/`: Admin portal components (election management, voter management, analytics, blockchain monitor)
- `src/components/voter/`: Voter portal components (registration, login, voting)
- `src/services/`: Business logic services (blockchain, biometric, storage, audit, smart contracts, transaction management)
- `src/types/`: TypeScript type definitions

## Enhanced Blockchain Features
### 1. Enhanced Security
- Multi-layer security with digital signatures
- Merkle tree implementation for transaction verification
- Block validation with cryptographic hashing
- Validator signatures for block authentication

### 2. Transaction Management
- Transaction pooling with configurable limits
- Priority-based transaction batching
- Gas calculation and tracking
- Transaction status tracking (pending, confirmed, failed)

### 3. Distributed Network
- Simulated peer-to-peer network architecture
- 6 network nodes (3 validators, 3 peers)
- Node health monitoring
- Network status tracking

### 4. Consensus Mechanism
- Proof of Authority (PoA) consensus
- Automatic validator rotation
- Validator reputation system
- Configurable block time and difficulty

### 5. Real-time Verification
- Transaction status verification
- Block confirmation tracking
- Real-time network metrics
- Transaction signature verification

### 6. Smart Contracts
- Election validation rules
- Vote validation logic
- Automated result calculation
- Contract execution tracking
- Contract metrics and analytics

### 7. Blockchain Monitoring System
- Real-time network metrics (TPS, block time, hash rate)
- Network health monitoring
- Anomaly detection (performance, security, consensus)
- Validator performance tracking
- Historical metrics collection
- Blockchain health reports with recommendations

## Development Setup
- **Port**: 5000 (frontend dev server)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Workflow**: "Start application" runs `npm run dev`

## Replit Configuration
1. **Vite Config**: Configured to bind to `0.0.0.0:5000` with proper HMR settings for Replit's proxy
2. **Workflow**: Single frontend workflow on port 5000 with webview output
3. **Deployment**: Uses `npm run build` and `npm run preview` on autoscale

## Recent Changes
- **2025-10-04**: GitHub Import Setup Completed
  - Installed all npm dependencies (390 packages)
  - Verified Vite configuration for Replit's proxy environment (0.0.0.0:5000)
  - Confirmed workflow "Start application" is running successfully
  - Set up deployment configuration (autoscale with build and preview)
  - Application is fully functional and accessible

- **2025-10-04**: Initial Replit setup
  - Configured Vite for Replit's proxy environment
  - Fixed duplicate key error in electionService.ts
  - Fixed missing 'result' field in AuditLog
  - Removed unused React imports
  - Set up deployment configuration

- **2025-10-04**: Enhanced Blockchain System Integration
  - Added enhanced blockchain types (transactions, nodes, smart contracts, consensus)
  - Implemented SmartContractService for automated voting rules and validation
  - Created TransactionManager for transaction pooling and batch processing
  - Built EnhancedBlockchainService with PoA consensus and distributed network
  - Developed BlockchainMonitoringService for real-time metrics and health monitoring
  - Created BlockchainMonitor admin dashboard for network visualization
  - Integrated all services into App initialization
  - Added Blockchain navigation option to admin portal

## Known Issues
- WebGL initialization warnings are expected in headless environments and don't affect functionality
- Biometric features use simulated data for demo purposes
- Blockchain monitoring metrics collector runs on 30-second intervals

## User Preferences
None set yet.
