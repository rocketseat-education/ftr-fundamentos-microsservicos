import { 
  SharedKafkaConsumer, 
  SharedKafkaProducer,
  createKafkaInstance, 
  TOPICS 
} from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import { db } from '../../db/connection.ts'
import { users } from '../../db/schema.ts'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import type {
  SagaStepCommandPayload,
  SagaStepResultPayload,
  SagaCompensationCommandPayload,
  SagaCompensationResultPayload
} from '@url-shortener/contracts/events/saga/saga-step-events.ts'
import { SAGA_STEP_TYPES, SAGA_TARGET_SERVICES } from '@url-shortener/contracts/events/saga/saga-step-events.ts'

// Create Kafka instance for auth service saga handling
const kafka = createKafkaInstance({
  clientId: 'auth-saga-step-consumer',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create producer for sending results
const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'Auth Service',
})

// Create consumer for receiving commands
const consumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Auth Service',
  groupId: 'auth-saga-step-group',
})

/**
 * Handle user account deletion command
 */
async function handleDeleteUserAccount(command: SagaStepCommandPayload): Promise<SagaStepResultPayload> {
  console.log(`Auth Service: Processing delete user account for user ${command.businessId}`)
  
  try {
    // Soft delete the user
    const result = await db
      .update(users)
      .set({ 
        deletedAt: new Date(),
        isActive: false 
      })
      .where(and(eq(users.id, command.businessId), isNull(users.deletedAt)))
      .returning()

    if (result.length === 0) {
      throw new Error('User not found or already deleted')
    }

    console.log(`Auth Service: Successfully soft deleted user ${command.businessId}`)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.AUTH,
      success: true,
      data: { deletedUserId: command.businessId },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Auth Service: Failed to delete user account:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.AUTH,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Handle user account restoration (compensation)
 */
async function handleRestoreUserAccount(command: SagaCompensationCommandPayload): Promise<SagaCompensationResultPayload> {
  console.log(`Auth Service: Processing restore user account for user ${command.businessId}`)
  
  try {
    // Restore the user
    const result = await db
      .update(users)
      .set({ 
        deletedAt: null,
        isActive: true 
      })
      .where(and(eq(users.id, command.businessId), isNotNull(users.deletedAt)))
      .returning()

    if (result.length === 0) {
      throw new Error('User not found or not deleted')
    }

    console.log(`Auth Service: Successfully restored user ${command.businessId}`)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.AUTH,
      success: true,
      data: { restoredUserId: command.businessId },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Auth Service: Failed to restore user account:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.AUTH,
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
  // Filter commands for auth service
  if (command.targetService !== SAGA_TARGET_SERVICES.AUTH) {
    return
  }

  console.log(`Auth Service: Received saga step command: ${command.stepType}`)

  let result: SagaStepResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.DELETE_USER_ACCOUNT:
      result = await handleDeleteUserAccount(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.AUTH,
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
  // Filter commands for auth service
  if (command.targetService !== SAGA_TARGET_SERVICES.AUTH) {
    return
  }

  console.log(`Auth Service: Received saga compensation command: ${command.stepType}`)

  let result: SagaCompensationResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.RESTORE_USER_ACCOUNT:
      result = await handleRestoreUserAccount(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.AUTH,
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

export class AuthSagaStepConsumer {
  async initialize(): Promise<void> {
    // Connect producer
    await producer.connect()
    console.log('Auth Service: Saga step producer connected')

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
    console.log('Auth Service: Saga step consumer started and listening for commands')
  }

  async shutdown(): Promise<void> {
    await consumer.disconnect()
    await producer.disconnect()
    console.log('Auth Service: Saga step consumer shutdown')
  }
}

// Export singleton instance
export const authSagaStepConsumer = new AuthSagaStepConsumer()