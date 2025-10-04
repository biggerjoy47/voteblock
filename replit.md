# Nigeria E-Voting System - Replit Setup

## Overview
This is a blockchain-enabled electronic voting platform for Nigeria, featuring biometric authentication, NIN (National Identification Number) validation, and secure vote storage.

## Architecture
- **Frontend Only**: React + TypeScript + Vite
- **Storage**: Browser-based IndexedDB for local data persistence
- **Key Technologies**:
  - React 18.3.1
  - TypeScript 5.5.3
  - Vite 5.4.2
  - TensorFlow.js for biometric verification
  - Chart.js for analytics
  - Tailwind CSS for styling

## Project Structure
- `src/components/admin/`: Admin portal components (election management, voter management, analytics)
- `src/components/voter/`: Voter portal components (registration, login, voting)
- `src/services/`: Business logic services (blockchain, biometric, storage, audit)
- `src/types/`: TypeScript type definitions

## Development Setup
- **Port**: 5000 (frontend dev server)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Workflow**: "Start application" runs `npm run dev`

## Replit Configuration
1. **Vite Config**: Configured to bind to `0.0.0.0:5000` with proper HMR settings for Replit's proxy
2. **Workflow**: Single frontend workflow on port 5000 with webview output
3. **Deployment**: Uses `npm run build` and `npm run preview` on autoscale

## Recent Changes
- **2025-10-04**: Initial Replit setup
  - Configured Vite for Replit's proxy environment
  - Fixed duplicate key error in electionService.ts
  - Fixed missing 'result' field in AuditLog
  - Removed unused React imports
  - Set up deployment configuration

## Known Issues
- WebGL initialization warnings are expected in headless environments and don't affect functionality
- Biometric features use simulated data for demo purposes

## User Preferences
None set yet.
