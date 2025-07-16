import type { Consumer, Kafka, KafkaMessage } from 'kafkajs'

export interface EventHandler<T = any> {
  (payload: T): Promise<void>
}

export interface KafkaConsumerConfig {
  kafka: Kafka
  serviceName: string
  groupId: string
  allowAutoTopicCreation?: boolean
  fromBeginning?: boolean
}

export class SharedKafkaConsumer {
  private consumer: Consumer
  private isConnected = false
  private serviceName: string
  private eventHandlers = new Map<string, EventHandler>()
  private subscribedTopics = new Set<string>()

  constructor(config: KafkaConsumerConfig) {
    this.serviceName = config.serviceName
    this.consumer = config.kafka.consumer({
      groupId: config.groupId,
      allowAutoTopicCreation: config.allowAutoTopicCreation ?? true,
    })
  }

  /**
   * Register an event handler for a specific event type
   */
  registerEventHandler<T>(eventType: string, handler: EventHandler<T>): void {
    this.eventHandlers.set(eventType, handler)
    console.log(`${this.serviceName}: Registered handler for event type: ${eventType}`)
  }

  /**
   * Register multiple event handlers at once
   */
  registerEventHandlers(handlers: Record<string, EventHandler>): void {
    for (const [eventType, handler] of Object.entries(handlers)) {
      this.registerEventHandler(eventType, handler)
    }
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.consumer.connect()
      this.isConnected = true
      console.log(`${this.serviceName} Kafka consumer connected`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.consumer.disconnect()
      this.isConnected = false
      console.log(`${this.serviceName} Kafka consumer disconnected`)
    }
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`${this.serviceName} Kafka consumer is not connected`)
    }

    const subscriptions = topics.map(async (topic) => {
      await this.consumer.subscribe({
        topic,
        fromBeginning: false,
      })
      this.subscribedTopics.add(topic)
    })

    await Promise.all(subscriptions)

    for (const topic of topics) {
      console.log(`${this.serviceName}: Subscribed to topic: ${topic}`)
    }
  }

  async start(): Promise<void> {
    if (!this.isConnected) {
      throw new Error(`${this.serviceName} Kafka consumer is not connected`)
    }

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.processMessage(message)
      },
    })

    console.log(`${this.serviceName} Kafka consumer started`)
  }

  private async processMessage(message: KafkaMessage): Promise<void> {
    if (!message.value) {
      console.warn(`${this.serviceName}: Received message with no value`)
      return
    }

    try {
      const event = JSON.parse(message.value.toString())

      if (!(event.type && event.payload)) {
        console.warn(`${this.serviceName}: Invalid event format:`, event)
        return
      }

      const handler = this.eventHandlers.get(event.type)
      if (handler) {
        await handler(event.payload)
        console.log(`${this.serviceName}: Processed event: ${event.type}`)
      } else {
        console.warn(`${this.serviceName}: No handler found for event type: ${event.type}`)
      }
    } catch (error) {
      console.error(`${this.serviceName}: Error processing message:`, error)
      // In a production environment, you might want to send this to a dead letter queue
    }
  }

  get connected(): boolean {
    return this.isConnected
  }

  get registeredEventTypes(): string[] {
    return Array.from(this.eventHandlers.keys())
  }

  get topics(): string[] {
    return Array.from(this.subscribedTopics)
  }
}