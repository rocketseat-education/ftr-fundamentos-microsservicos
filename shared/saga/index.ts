// Shared SAGA utilities for distributed transaction management
// Orchestration logic is in the dedicated orchestrator app

export * from './types.ts'
export * from './orchestrator.ts' // HTTP client for communicating with orchestrator service

// Common saga types for reference
export const SAGA_TYPES = {
  USER_DELETION: 'user-deletion',
  // Add more saga types here as needed
} as const