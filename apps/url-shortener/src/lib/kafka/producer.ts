import { SharedKafkaProducer, createKafkaInstance } from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import {
  getEventTopic,
  getPublisherTopics,
  getRegisteredEventTypes,
  type producedEvents,
} from './events/produced.ts'

// Create Kafka instance for url-shortener service
const kafka = createKafkaInstance({
  clientId: 'url-shortener-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create shared producer instance
const sharedProducer = new SharedKafkaProducer({
  kafka,
  serviceName: 'URL Shortener Service',
})

export class KafkaProducer {
  /**
   * Initialize the producer with all registered event publishers
   */
  initialize(): void {
    const registeredEventTypes = getRegisteredEventTypes()
    const publisherTopics = getPublisherTopics()

    console.log('URL Shortener Service: Initializing producer with events:', registeredEventTypes)
    console.log('URL Shortener Service: Will publish to topics:', publisherTopics)

    for (const eventType of registeredEventTypes) {
      console.log(`URL Shortener Service: Registered publisher for event type: ${eventType}`)
    }
  }

  async connect(): Promise<void> {
    await sharedProducer.connect()
  }

  async disconnect(): Promise<void> {
    await sharedProducer.disconnect()
  }

  async publishEvent<T>(
    eventType: keyof typeof producedEvents,
    payload: T
  ): Promise<void> {
    if (!sharedProducer.connected) {
      throw new Error('Kafka producer is not connected')
    }

    const topic = getEventTopic(eventType as keyof typeof producedEvents)
    if (!topic) {
      throw new Error(`No topic found for event type: ${eventType}`)
    }

    await sharedProducer.publishEvent(topic, eventType, payload)
  }

  async send(options: {
    topic: string
    messages: Array<{
      key: string
      value: string
    }>
  }): Promise<void> {
    if (!sharedProducer.connected) {
      throw new Error('Kafka producer is not connected')
    }

    await sharedProducer.send(options)
  }
}

// Singleton instance
export const kafkaProducer = new KafkaProducer()
