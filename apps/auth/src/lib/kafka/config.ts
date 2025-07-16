import { 
  createKafkaInstance, 
  TOPICS, 
  CONSUMER_GROUPS 
} from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import type { Kafka } from 'kafkajs'

// Create Kafka instance for auth service
export const kafka: Kafka = createKafkaInstance({
  clientId: 'auth-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Re-export shared configuration
export { TOPICS, CONSUMER_GROUPS }