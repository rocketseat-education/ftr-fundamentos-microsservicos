import type { Consumer, Producer, Kafka } from 'kafkajs'

export interface KafkaConnectionManager {
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
}

export class BaseKafkaConnection implements KafkaConnectionManager {
  protected kafka: Kafka
  protected isConnectedFlag = false

  constructor(kafka: Kafka) {
    this.kafka = kafka
  }

  async connect(): Promise<void> {
    if (!this.isConnectedFlag) {
      await this.doConnect()
      this.isConnectedFlag = true
      console.log(`Kafka connection established`)
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnectedFlag) {
      await this.doDisconnect()
      this.isConnectedFlag = false
      console.log(`Kafka connection closed`)
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag
  }

  protected async doConnect(): Promise<void> {
    // Override in subclasses
  }

  protected async doDisconnect(): Promise<void> {
    // Override in subclasses
  }
}

export class KafkaProducerConnection extends BaseKafkaConnection {
  private producer: Producer

  constructor(kafka: Kafka, config?: { allowAutoTopicCreation?: boolean; transactionTimeout?: number }) {
    super(kafka)
    this.producer = kafka.producer({
      allowAutoTopicCreation: config?.allowAutoTopicCreation ?? true,
      transactionTimeout: config?.transactionTimeout ?? 30000,
    })
  }

  protected async doConnect(): Promise<void> {
    await this.producer.connect()
  }

  protected async doDisconnect(): Promise<void> {
    await this.producer.disconnect()
  }

  getProducer(): Producer {
    return this.producer
  }
}

export class KafkaConsumerConnection extends BaseKafkaConnection {
  private consumer: Consumer

  constructor(kafka: Kafka, config: { groupId: string; allowAutoTopicCreation?: boolean }) {
    super(kafka)
    this.consumer = kafka.consumer({
      groupId: config.groupId,
      allowAutoTopicCreation: config.allowAutoTopicCreation ?? true,
    })
  }

  protected async doConnect(): Promise<void> {
    await this.consumer.connect()
  }

  protected async doDisconnect(): Promise<void> {
    await this.consumer.disconnect()
  }

  getConsumer(): Consumer {
    return this.consumer
  }
}