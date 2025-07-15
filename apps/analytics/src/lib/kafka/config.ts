import {
  CONSUMER_GROUPS,
  createKafkaInstance,
  TOPICS,
} from '@microservices/shared/kafka/config.ts'
import { env } from '../../env.ts'

export const kafka = createKafkaInstance({
  clientId: 'analytics-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

export { TOPICS, CONSUMER_GROUPS }
