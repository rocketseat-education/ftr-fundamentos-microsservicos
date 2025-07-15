import type { Consumer, KafkaMessage } from 'kafkajs'
import { CONSUMER_GROUPS, kafka } from './config.ts'
import {
  getEventHandler,
  getRegisteredEvents,
  getRegisteredTopics,
} from './events/consumed.ts'

export class KafkaConsumer {
  private consumer: Consumer
  private isConnected = false

  constructor() {
    this.consumer = kafka.consumer({
      groupId: CONSUMER_GROUPS.ANALYTICS,
      allowAutoTopicCreation: true,
    })
  }

  /**
   * Initialize the consumer with all registered event handlers
   */
  initialize(): void {
    const registeredEvents = getRegisteredEvents()
    const registeredTopics = getRegisteredTopics()

    console.log('Initializing consumer with events:', registeredEvents)
    console.log('Will subscribe to topics:', registeredTopics)

    for (const eventType of registeredEvents) {
      console.log(`Registered handler for event type: ${eventType}`)
    }
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.consumer.connect()
      this.isConnected = true
      console.log('Kafka consumer connected')
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.consumer.disconnect()
      this.isConnected = false
      console.log('Kafka consumer disconnected')
    }
  }

  async subscribe(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka consumer is not connected')
    }

    const topics = getRegisteredTopics()

    const subscriptions = topics.map((topic) =>
      this.consumer.subscribe({
        topic,
        fromBeginning: false,
      })
    )

    await Promise.all(subscriptions)

    for (const topic of topics) {
      console.log(`Subscribed to topic: ${topic}`)
    }
  }

  async start(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.processMessage(message)
      },
    })

    console.log('Kafka consumer started')
  }

  private async processMessage(message: KafkaMessage): Promise<void> {
    if (!message.value) {
      console.warn('Received message with no value')
      return
    }

    try {
      const event = JSON.parse(message.value.toString())

      if (!(event.type && event.payload)) {
        console.warn('Invalid event format:', event)
        return
      }

      const handler = getEventHandler(event.type)
      if (handler) {
        await handler(event.payload)
        console.log(`Processed event: ${event.type}`)
      } else {
        console.warn(`No handler found for event type: ${event.type}`)
      }
    } catch (error) {
      console.error('Error processing message:', error)
      // In a production environment, you might want to send this to a dead letter queue
    }
  }
}

// Singleton instance
export const kafkaConsumer = new KafkaConsumer()
