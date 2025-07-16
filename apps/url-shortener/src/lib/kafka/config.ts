import {
  CONSUMER_GROUPS,
  createKafkaInstance,
  TOPICS,
} from '@url-shortener/shared/kafka/config.ts'
import { env } from '../../env.ts'
import type { Kafka } from 'kafkajs'

export const kafka: Kafka = createKafkaInstance({
  clientId: 'url-shortener-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

export { TOPICS, CONSUMER_GROUPS }
