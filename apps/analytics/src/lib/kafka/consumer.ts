import { SharedKafkaConsumer, createKafkaInstance, CONSUMER_GROUPS } from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import {
  getEventHandler,
  getRegisteredEvents,
  getRegisteredTopics,
} from './events/consumed.ts'

// Create Kafka instance for analytics service
const kafka = createKafkaInstance({
  clientId: 'analytics-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create shared consumer instance
const sharedConsumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Analytics Service',
  groupId: CONSUMER_GROUPS.ANALYTICS,
})

export class KafkaConsumer {
  /**
   * Initialize the consumer with all registered event handlers
   */
  initialize(): void {
    const registeredEvents = getRegisteredEvents()
    const registeredTopics = getRegisteredTopics()

    console.log('Analytics Service: Initializing consumer with events:', registeredEvents)
    console.log('Analytics Service: Will subscribe to topics:', registeredTopics)

    // Register all event handlers from the consumed events registry
    const handlers: Record<string, any> = {}
    for (const eventType of registeredEvents) {
      const handler = getEventHandler(eventType)
      if (handler) {
        handlers[eventType] = handler
      }
    }
    
    sharedConsumer.registerEventHandlers(handlers)

    for (const eventType of registeredEvents) {
      console.log(`Analytics Service: Registered handler for event type: ${eventType}`)
    }
  }

  async connect(): Promise<void> {
    await sharedConsumer.connect()
  }

  async disconnect(): Promise<void> {
    await sharedConsumer.disconnect()
  }

  async subscribe(): Promise<void> {
    const topics = getRegisteredTopics()
    await sharedConsumer.subscribe(topics)
  }

  async start(): Promise<void> {
    await sharedConsumer.start()
  }
}

// Singleton instance
export const kafkaConsumer = new KafkaConsumer()
