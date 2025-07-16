import type { Producer } from 'kafkajs'
import { kafka, TOPICS } from './config.ts'

export class KafkaProducer {
  private producer: Producer
  private isConnected = false

  constructor() {
    this.producer = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30_000,
    })
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect()
      this.isConnected = true
      console.log('Kafka producer connected')
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect()
      this.isConnected = false
      console.log('Kafka producer disconnected')
    }
  }

  async publish(options: {
    topic: string
    event: { type: string; payload: any }
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected')
    }

    await this.producer.send({
      topic: options.topic,
      messages: [
        {
          key: options.event.type,
          value: JSON.stringify(options.event),
          timestamp: Date.now().toString(),
        },
      ],
    })

    console.log(`Published event ${options.event.type} to topic ${options.topic}`)
  }

  async send(options: {
    topic: string
    messages: Array<{
      key: string
      value: string
    }>
  }): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected')
    }

    await this.producer.send({
      topic: options.topic,
      messages: options.messages,
    })

    console.log(`Sent ${options.messages.length} messages to topic ${options.topic}`)
  }
}

// Singleton instance
export const kafkaProducer = new KafkaProducer()