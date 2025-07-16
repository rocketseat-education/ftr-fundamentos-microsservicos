import { createId } from '@paralleldrive/cuid2'
import type { SagaServiceClient } from './types.ts'
import type { SharedKafkaProducer, SharedKafkaConsumer } from '@url-shortener/shared/kafka/index.ts'
import { TOPICS } from '@url-shortener/shared/kafka/index.ts'
import type { 
  SagaStepCommandPayload, 
  SagaStepResultPayload,
  SagaCompensationCommandPayload,
  SagaCompensationResultPayload 
} from '@url-shortener/contracts/events/saga/saga-step-events.ts'

/**
 * Kafka-based client for SAGA step execution
 * Handles service-to-service communication via Kafka for SAGA operations
 */
export class KafkaSagaServiceClient implements SagaServiceClient {
  private producer: SharedKafkaProducer
  private consumer: SharedKafkaConsumer
  private pendingRequests = new Map<string, {
    resolve: (result: Record<string, any>) => void
    reject: (error: Error) => void
    timeoutId: NodeJS.Timeout
  }>()

  constructor(producer: SharedKafkaProducer, consumer: SharedKafkaConsumer) {
    this.producer = producer
    this.consumer = consumer
  }

  async initialize(): Promise<void> {
    // Register handlers for step results
    this.consumer.registerEventHandler<SagaStepResultPayload>(
      'saga-step-result',
      async (payload) => {
        await this.handleStepResult(payload)
      }
    )

    // Register handlers for compensation results
    this.consumer.registerEventHandler<SagaCompensationResultPayload>(
      'saga-compensation-result',
      async (payload) => {
        await this.handleCompensationResult(payload)
      }
    )

    // Subscribe to result topics
    await this.consumer.subscribe([
      TOPICS.ORCHESTRATOR_SAGA_STEP_RESULTS,
      TOPICS.ORCHESTRATOR_SAGA_COMPENSATION_RESULTS,
    ])
  }

  async executeStep(
    endpoint: string,
    method: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const correlationId = createId()
    const { targetService, stepType } = this.parseEndpoint(endpoint)

    console.log(`Executing SAGA step via Kafka: ${stepType} on ${targetService}`)

    // Create command payload
    const command: SagaStepCommandPayload = {
      correlationId,
      sagaId: payload.sagaId,
      stepNumber: payload.stepNumber || 1,
      stepType,
      targetService,
      businessId: payload.businessId || '',
      metadata: payload,
      timestamp: new Date().toISOString(),
    }

    // Send command and wait for result
    const result = await this.sendCommandAndWaitForResult(
      TOPICS.ORCHESTRATOR_SAGA_STEP_COMMANDS,
      'saga-step-command',
      command,
      correlationId,
      30000 // 30 second timeout
    )

    console.log(`SAGA step completed successfully via Kafka:`, result)
    return result
  }

  async compensateStep(
    endpoint: string,
    method: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const correlationId = createId()
    const { targetService, stepType } = this.parseEndpoint(endpoint)

    console.log(`Compensating SAGA step via Kafka: ${stepType} on ${targetService}`)

    // Create compensation command payload
    const command: SagaCompensationCommandPayload = {
      correlationId,
      sagaId: payload.sagaId,
      stepNumber: payload.stepNumber || 1,
      stepType,
      targetService,
      businessId: payload.businessId || '',
      originalStepData: payload.originalStepData,
      metadata: payload,
      timestamp: new Date().toISOString(),
    }

    // Send command and wait for result
    const result = await this.sendCommandAndWaitForResult(
      TOPICS.ORCHESTRATOR_SAGA_COMPENSATION_COMMANDS,
      'saga-compensation-command',
      command,
      correlationId,
      30000 // 30 second timeout
    )

    console.log(`SAGA step compensated successfully via Kafka:`, result)
    return result
  }

  private parseEndpoint(endpoint: string): { targetService: string; stepType: string } {
    // For Kafka-based approach, endpoint format is "service:step-type"
    // e.g., "url-shortener:delete-user-urls"
    const [targetService, stepType] = endpoint.split(':')
    
    if (!targetService || !stepType) {
      throw new Error(`Invalid endpoint format: ${endpoint}. Expected format: "service:step-type"`)
    }

    return { targetService, stepType }
  }

  private async sendCommandAndWaitForResult(
    topic: string,
    eventType: string,
    command: any,
    correlationId: string,
    timeoutMs: number
  ): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(correlationId)
        reject(new Error(`Timeout waiting for response to correlation ID: ${correlationId}`))
      }, timeoutMs)

      // Store pending request
      this.pendingRequests.set(correlationId, { resolve, reject, timeoutId })

      // Send command
      this.producer.publishEvent(topic, eventType, command, correlationId)
        .catch((error) => {
          this.pendingRequests.delete(correlationId)
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  private async handleStepResult(payload: SagaStepResultPayload): Promise<void> {
    const pending = this.pendingRequests.get(payload.correlationId)
    if (!pending) {
      console.warn(`Received step result for unknown correlation ID: ${payload.correlationId}`)
      return
    }

    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(payload.correlationId)

    if (payload.success) {
      pending.resolve(payload.data || {})
    } else {
      pending.reject(new Error(payload.error || 'Step execution failed'))
    }
  }

  private async handleCompensationResult(payload: SagaCompensationResultPayload): Promise<void> {
    const pending = this.pendingRequests.get(payload.correlationId)
    if (!pending) {
      console.warn(`Received compensation result for unknown correlation ID: ${payload.correlationId}`)
      return
    }

    clearTimeout(pending.timeoutId)
    this.pendingRequests.delete(payload.correlationId)

    if (payload.success) {
      pending.resolve(payload.data || {})
    } else {
      pending.reject(new Error(payload.error || 'Compensation failed'))
    }
  }

  async shutdown(): Promise<void> {
    // Clear all pending requests
    for (const [correlationId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Service client shutting down'))
    }
    this.pendingRequests.clear()
  }
}