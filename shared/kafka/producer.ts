import type { Kafka, Producer } from 'kafkajs'

export interface KafkaProducerConfig {
  kafka: Kafka
  serviceName: string
  allowAutoTopicCreation?: boolean
  transactionTimeout?: number
}

export class SharedKafkaProducer {
  private producer: Producer
  private isConnected = false
  private serviceName: string

  constructor(config: KafkaProducerConfig) {
    this.serviceName = config.serviceName
    this.producer = config.kafka.producer({
      allowAutoTopicCreation: config.allowAutoTopicCreation ?? true,
      transactionTimeout: config.transactionTimeout ?? 30_000,
    })
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect()
      this.isConnected = true
      console.log(`${this.serviceName} Kafka producer connected`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect()
      this.isConnected = false
      console.log(`${this.serviceName} Kafka producer disconnected`)
    }
  }

  async send(options: {
    topic: string
    messages: Array<{
      key: string
      value: string
      timestamp?: string
    }>
  }): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }

    await this.producer.send({
      topic: options.topic,
      messages: options.messages,
    })

    console.log(`${this.serviceName}: Sent ${options.messages.length} messages to topic ${options.topic}`)
  }

  async publishEvent<T>(
    topic: string,
    eventType: string,
    payload: T,
    key?: string
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }

    const event = {
      type: eventType,
      payload,
    }

    await this.producer.send({
      topic,
      messages: [
        {
          key: key || eventType,
          value: JSON.stringify(event),
          timestamp: Date.now().toString(),
        },
      ],
    })

    console.log(`${this.serviceName}: Published event ${eventType} to topic ${topic}`)
  }

  get connected(): boolean {
    return this.isConnected
  }
}