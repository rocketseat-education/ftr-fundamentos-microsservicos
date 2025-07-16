import { 
  SharedKafkaConsumer, 
  SharedKafkaProducer,
  createKafkaInstance, 
  TOPICS 
} from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import { db } from '../../db/connection.ts'
import { clicks, urlCreations } from '../../db/schema.ts'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import type {
  SagaStepCommandPayload,
  SagaStepResultPayload,
  SagaCompensationCommandPayload,
  SagaCompensationResultPayload
} from '@url-shortener/contracts/events/saga/saga-step-events.ts'
import { SAGA_STEP_TYPES, SAGA_TARGET_SERVICES } from '@url-shortener/contracts/events/saga/saga-step-events.ts'

// Create Kafka instance for analytics service saga handling
const kafka = createKafkaInstance({
  clientId: 'analytics-saga-step-consumer',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create producer for sending results
const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'Analytics Service',
})

// Create consumer for receiving commands
const consumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Analytics Service',
  groupId: 'analytics-saga-step-group',
})

/**
 * Handle user analytics deletion command
 */
async function handleDeleteUserAnalytics(command: SagaStepCommandPayload): Promise<SagaStepResultPayload> {
  console.log(`Analytics Service: Processing delete user analytics for user ${command.businessId}`)
  
  try {
    // Start a transaction to delete all user analytics data
    await db.transaction(async (tx) => {
      // Soft delete clicks for user's URLs
      const clicksResult = await tx
        .update(clicks)
        .set({ 
          deletedAt: new Date()
        })
        .where(and(eq(clicks.userId, command.businessId), isNull(clicks.deletedAt)))
        .returning()

      // Soft delete URL creation records for user
      const urlCreationsResult = await tx
        .update(urlCreations)
        .set({ 
          deletedAt: new Date()
        })
        .where(and(eq(urlCreations.userId, command.businessId), isNull(urlCreations.deletedAt)))
        .returning()

      console.log(`Analytics Service: Soft deleted ${clicksResult.length} clicks and ${urlCreationsResult.length} URL creations for user ${command.businessId}`)
    })
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.ANALYTICS,
      success: true,
      data: { 
        message: `Analytics data deleted for user ${command.businessId}`
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Analytics Service: Failed to delete user analytics:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.ANALYTICS,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Handle user analytics restoration (compensation)
 */
async function handleRestoreUserAnalytics(command: SagaCompensationCommandPayload): Promise<SagaCompensationResultPayload> {
  console.log(`Analytics Service: Processing restore user analytics for user ${command.businessId}`)
  
  try {
    // Start a transaction to restore all user analytics data
    await db.transaction(async (tx) => {
      // Restore clicks for user's URLs
      const clicksResult = await tx
        .update(clicks)
        .set({ 
          deletedAt: null
        })
        .where(and(eq(clicks.userId, command.businessId), isNotNull(clicks.deletedAt)))
        .returning()

      // Restore URL creation records for user
      const urlCreationsResult = await tx
        .update(urlCreations)
        .set({ 
          deletedAt: null
        })
        .where(and(eq(urlCreations.userId, command.businessId), isNotNull(urlCreations.deletedAt)))
        .returning()

      console.log(`Analytics Service: Restored ${clicksResult.length} clicks and ${urlCreationsResult.length} URL creations for user ${command.businessId}`)
    })
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.ANALYTICS,
      success: true,
      data: { 
        message: `Analytics data restored for user ${command.businessId}`
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Analytics Service: Failed to restore user analytics:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.ANALYTICS,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Process saga step command
 */
async function processSagaStepCommand(command: SagaStepCommandPayload): Promise<void> {
  // Filter commands for analytics service
  if (command.targetService !== SAGA_TARGET_SERVICES.ANALYTICS) {
    return
  }

  console.log(`Analytics Service: Received saga step command: ${command.stepType}`)

  let result: SagaStepResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.DELETE_USER_ANALYTICS:
      result = await handleDeleteUserAnalytics(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.ANALYTICS,
        success: false,
        error: `Unknown step type: ${command.stepType}`,
        timestamp: new Date().toISOString(),
      }
  }

  // Send result back to orchestrator
  await producer.publishEvent(
    TOPICS.ORCHESTRATOR_SAGA_STEP_RESULTS,
    'saga-step-result',
    result,
    command.correlationId
  )
}

/**
 * Process saga compensation command
 */
async function processSagaCompensationCommand(command: SagaCompensationCommandPayload): Promise<void> {
  // Filter commands for analytics service
  if (command.targetService !== SAGA_TARGET_SERVICES.ANALYTICS) {
    return
  }

  console.log(`Analytics Service: Received saga compensation command: ${command.stepType}`)

  let result: SagaCompensationResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.RESTORE_USER_ANALYTICS:
      result = await handleRestoreUserAnalytics(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.ANALYTICS,
        success: false,
        error: `Unknown compensation type: ${command.stepType}`,
        timestamp: new Date().toISOString(),
      }
  }

  // Send result back to orchestrator
  await producer.publishEvent(
    TOPICS.ORCHESTRATOR_SAGA_COMPENSATION_RESULTS,
    'saga-compensation-result',
    result,
    command.correlationId
  )
}

export class AnalyticsSagaStepConsumer {
  async initialize(): Promise<void> {
    // Connect producer
    await producer.connect()
    console.log('Analytics Service: Saga step producer connected')

    // Register event handlers
    consumer.registerEventHandler<SagaStepCommandPayload>(
      'saga-step-command',
      processSagaStepCommand
    )

    consumer.registerEventHandler<SagaCompensationCommandPayload>(
      'saga-compensation-command',
      processSagaCompensationCommand
    )

    // Connect and subscribe to topics
    await consumer.connect()
    await consumer.subscribe([
      TOPICS.ORCHESTRATOR_SAGA_STEP_COMMANDS,
      TOPICS.ORCHESTRATOR_SAGA_COMPENSATION_COMMANDS,
    ])
    
    await consumer.start()
    console.log('Analytics Service: Saga step consumer started and listening for commands')
  }

  async shutdown(): Promise<void> {
    await consumer.disconnect()
    await producer.disconnect()
    console.log('Analytics Service: Saga step consumer shutdown')
  }
}

// Export singleton instance
export const analyticsSagaStepConsumer = new AnalyticsSagaStepConsumer()