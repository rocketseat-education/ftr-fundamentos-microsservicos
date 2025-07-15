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
} as const

// Common consumer groups
export const CONSUMER_GROUPS = {
  URL_SHORTENER: 'url-shortener-group',
  ANALYTICS: 'analytics-group',
} as const