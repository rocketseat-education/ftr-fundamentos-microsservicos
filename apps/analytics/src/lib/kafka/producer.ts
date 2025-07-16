import { SharedKafkaProducer, createKafkaInstance } from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'

// Create Kafka instance for analytics service
const kafka = createKafkaInstance({
  clientId: 'analytics-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create shared producer instance
export const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'Analytics Service',
})

// Backward compatibility wrapper for existing code
export class KafkaProducer {
  async connect(): Promise<void> {
    await producer.connect()
  }

  async disconnect(): Promise<void> {
    await producer.disconnect()
  }

  async send(options: {
    topic: string
    messages: Array<{
      key: string
      value: string
    }>
  }): Promise<void> {
    await producer.send(options)
  }
}