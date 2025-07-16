import { 
  SharedKafkaConsumer, 
  SharedKafkaProducer,
  createKafkaInstance, 
  TOPICS 
} from '@url-shortener/shared/kafka/index.ts'
import { env } from '../../env.ts'
import { db } from '../../db/connection.ts'
import { urls } from '../../db/schema.ts'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import type {
  SagaStepCommandPayload,
  SagaStepResultPayload,
  SagaCompensationCommandPayload,
  SagaCompensationResultPayload
} from '@url-shortener/contracts/events/saga/saga-step-events.ts'
import { SAGA_STEP_TYPES, SAGA_TARGET_SERVICES } from '@url-shortener/contracts/events/saga/saga-step-events.ts'

// Create Kafka instance for URL shortener service saga handling
const kafka = createKafkaInstance({
  clientId: 'url-shortener-saga-step-consumer',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create producer for sending results
const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'URL Shortener Service',
})

// Create consumer for receiving commands
const consumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'URL Shortener Service',
  groupId: 'url-shortener-saga-step-group',
})

/**
 * Handle user URLs deletion command
 */
async function handleDeleteUserUrls(command: SagaStepCommandPayload): Promise<SagaStepResultPayload> {
  console.log(`URL Shortener Service: Processing delete user URLs for user ${command.businessId}`)
  
  try {
    // Soft delete all URLs belonging to the user
    const result = await db
      .update(urls)
      .set({ 
        deletedAt: new Date()
      })
      .where(and(eq(urls.userId, command.businessId), isNull(urls.deletedAt)))
      .returning()

    console.log(`URL Shortener Service: Successfully soft deleted ${result.length} URLs for user ${command.businessId}`)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.URL_SHORTENER,
      success: true,
      data: { 
        deletedCount: result.length,
        deletedUrls: result.map(url => ({
          id: url.id,
          shortCode: url.shortCode
        }))
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`URL Shortener Service: Failed to delete user URLs:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.URL_SHORTENER,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Handle user URLs restoration (compensation)
 */
async function handleRestoreUserUrls(command: SagaCompensationCommandPayload): Promise<SagaCompensationResultPayload> {
  console.log(`URL Shortener Service: Processing restore user URLs for user ${command.businessId}`)
  
  try {
    // Restore all URLs belonging to the user
    const result = await db
      .update(urls)
      .set({ 
        deletedAt: null
      })
      .where(and(eq(urls.userId, command.businessId), isNotNull(urls.deletedAt)))
      .returning()

    console.log(`URL Shortener Service: Successfully restored ${result.length} URLs for user ${command.businessId}`)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.URL_SHORTENER,
      success: true,
      data: { 
        restoredCount: result.length,
        restoredUrls: result.map(url => ({
          id: url.id,
          shortCode: url.shortCode
        }))
      },
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`URL Shortener Service: Failed to restore user URLs:`, error)
    
    return {
      correlationId: command.correlationId,
      sagaId: command.sagaId,
      stepNumber: command.stepNumber,
      stepType: command.stepType,
      service: SAGA_TARGET_SERVICES.URL_SHORTENER,
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
  // Filter commands for URL shortener service
  if (command.targetService !== SAGA_TARGET_SERVICES.URL_SHORTENER) {
    return
  }

  console.log(`URL Shortener Service: Received saga step command: ${command.stepType}`)

  let result: SagaStepResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.DELETE_USER_URLS:
      result = await handleDeleteUserUrls(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.URL_SHORTENER,
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
  // Filter commands for URL shortener service
  if (command.targetService !== SAGA_TARGET_SERVICES.URL_SHORTENER) {
    return
  }

  console.log(`URL Shortener Service: Received saga compensation command: ${command.stepType}`)

  let result: SagaCompensationResultPayload

  switch (command.stepType) {
    case SAGA_STEP_TYPES.RESTORE_USER_URLS:
      result = await handleRestoreUserUrls(command)
      break
    default:
      result = {
        correlationId: command.correlationId,
        sagaId: command.sagaId,
        stepNumber: command.stepNumber,
        stepType: command.stepType,
        service: SAGA_TARGET_SERVICES.URL_SHORTENER,
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

export class UrlShortenerSagaStepConsumer {
  async initialize(): Promise<void> {
    // Connect producer
    await producer.connect()
    console.log('URL Shortener Service: Saga step producer connected')

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
    console.log('URL Shortener Service: Saga step consumer started and listening for commands')
  }

  async shutdown(): Promise<void> {
    await consumer.disconnect()
    await producer.disconnect()
    console.log('URL Shortener Service: Saga step consumer shutdown')
  }
}

// Export singleton instance
export const urlShortenerSagaStepConsumer = new UrlShortenerSagaStepConsumer()