// Shared orchestration utilities for Kafka-based orchestration

export * from './types.ts'
export * from './kafka-orchestrator.ts'

// Common orchestration event types
export const ORCHESTRATION_EVENTS = {
  USER_DELETION: 'user-deletion',
  // Add more orchestration event types here as needed
} as const

export type OrchestrationEventType = typeof ORCHESTRATION_EVENTS[keyof typeof ORCHESTRATION_EVENTS]