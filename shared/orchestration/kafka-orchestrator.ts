import { createId } from '@paralleldrive/cuid2'
import { SharedKafkaProducer, SharedKafkaConsumer } from '../kafka/index.ts'
import type { OrchestrationRequest, OrchestrationResponse } from './types.ts'

export interface KafkaOrchestratorConfig {
  producer: SharedKafkaProducer
  consumer: SharedKafkaConsumer
  requestTopic: string
  responseTopic: string
  requestTimeoutMs?: number
}

export class KafkaOrchestrator {
  private producer: SharedKafkaProducer
  private consumer: SharedKafkaConsumer
  private requestTopic: string
  private responseTopic: string
  private requestTimeoutMs: number
  private pendingRequests = new Map<string, {
    resolve: (response: OrchestrationResponse) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }>()

  constructor(config: KafkaOrchestratorConfig) {
    this.producer = config.producer
    this.consumer = config.consumer
    this.requestTopic = config.requestTopic
    this.responseTopic = config.responseTopic
    this.requestTimeoutMs = config.requestTimeoutMs || 30000 // 30 seconds default
  }

  async initialize(): Promise<void> {
    await this.consumer.connect()
    await this.consumer.subscribe([this.responseTopic])
    
    // Register response handler
    this.consumer.registerEventHandler<OrchestrationResponse>('orchestration-response', async (response) => {
      const pending = this.pendingRequests.get(response.requestId)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(response.requestId)
        pending.resolve(response)
      }
    })

    await this.consumer.start()
  }

  async requestOrchestration(
    eventType: string,
    businessId: string,
    metadata?: Record<string, any>
  ): Promise<OrchestrationResponse> {
    const requestId = createId()
    const request: OrchestrationRequest = {
      requestId,
      eventType,
      businessId,
      metadata,
      requestedBy: 'service', // Will be overridden by caller
      timestamp: new Date().toISOString(),
    }

    // Create promise that will be resolved when response is received
    const responsePromise = new Promise<OrchestrationResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`Orchestration request timeout after ${this.requestTimeoutMs}ms`))
      }, this.requestTimeoutMs)

      this.pendingRequests.set(requestId, { resolve, reject, timeout })
    })

    // Send request to orchestrator
    await this.producer.publishEvent(
      this.requestTopic,
      'orchestration-request',
      request,
      requestId
    )

    return await responsePromise
  }

  async shutdown(): Promise<void> {
    // Clear all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Orchestrator shutting down'))
    }
    this.pendingRequests.clear()

    await this.consumer.disconnect()
  }
}