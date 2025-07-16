import type { SagaEventPublisher } from './orchestrator.ts'

/**
 * Generic Kafka event publisher for SAGA events
 * Each service can use this with their own Kafka producer
 */
export class KafkaSagaEventPublisher implements SagaEventPublisher {
  private kafkaProducer: {
    publish(options: {
      topic: string
      event: { type: string; payload: any }
    }): Promise<void>
  }

  constructor(
    kafkaProducer: {
      publish(options: {
        topic: string
        event: { type: string; payload: any }
      }): Promise<void>
    }
  ) {
    this.kafkaProducer = kafkaProducer
  }

  async publishSagaStarted(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    startedAt: string
    metadata?: Record<string, any>
  }): Promise<void> {
    await this.kafkaProducer.publish({
      topic: 'saga-events',
      event: {
        type: 'saga.started',
        payload,
      },
    })
  }

  async publishSagaCompleted(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    success: boolean
    completedAt: string
    totalSteps: number
    duration: number
  }): Promise<void> {
    await this.kafkaProducer.publish({
      topic: 'saga-events',
      event: {
        type: 'saga.completed',
        payload,
      },
    })
  }

  async publishSagaFailed(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    failedStep: number
    errorMessage: string
    compensationRequired: boolean
    failedAt: string
  }): Promise<void> {
    await this.kafkaProducer.publish({
      topic: 'saga-events',
      event: {
        type: 'saga.failed',
        payload,
      },
    })
  }

  async publishStepCompleted(payload: {
    sagaId: string
    stepNumber: number
    stepType: string
    targetService: string
    success: boolean
    responsePayload?: Record<string, any>
    errorMessage?: string
    completedAt: string
  }): Promise<void> {
    await this.kafkaProducer.publish({
      topic: 'saga-events',
      event: {
        type: 'saga.step.completed',
        payload,
      },
    })
  }
}