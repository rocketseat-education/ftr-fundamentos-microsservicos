import { Kafka } from 'kafkajs'

export interface KafkaConfig {
  clientId: string
  brokers: string[]
  retry?: {
    initialRetryTime?: number
    retries?: number
  }
}

export function createKafkaInstance(config: KafkaConfig): Kafka {
  return new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    retry: config.retry || {
      initialRetryTime: 100,
      retries: 8,
    },
  })
}

// Common topics shared across services
export const TOPICS = {
  URL_EVENTS: 'url-events',
  ORCHESTRATION_REQUESTS: 'orchestration-requests',
  ORCHESTRATION_RESPONSES: 'orchestration-responses',
  // Saga orchestration topics
  ORCHESTRATOR_SAGA_STEP_COMMANDS: 'orchestrator.saga-step-commands',
  ORCHESTRATOR_SAGA_STEP_RESULTS: 'orchestrator.saga-step-results',
  ORCHESTRATOR_SAGA_COMPENSATION_COMMANDS: 'orchestrator.saga-compensation-commands',
  ORCHESTRATOR_SAGA_COMPENSATION_RESULTS: 'orchestrator.saga-compensation-results',
} as const

// Common consumer groups
export const CONSUMER_GROUPS = {
  URL_SHORTENER: 'url-shortener-group',
  ANALYTICS: 'analytics-group',
  AUTH: 'auth-group',
  ORCHESTRATOR: 'orchestrator-group',
} as const