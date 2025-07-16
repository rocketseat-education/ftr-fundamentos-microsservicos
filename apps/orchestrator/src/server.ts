// import './tracing.ts'

import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { db } from './db/connection.ts'
import { sagas as sagasTable, sagaSteps as sagaStepsTable } from './db/schema.ts'
import {
  SimpleSagaOrchestrator,
  DrizzleSagaDatabase,
  KafkaSagaEventPublisher
} from './saga/index.ts'
import { KafkaSagaServiceClient } from './saga/kafka-service-client.ts'
import { createKafkaInstance, SharedKafkaProducer, SharedKafkaConsumer, TOPICS, CONSUMER_GROUPS } from '@url-shortener/shared/kafka/index.ts'
import { type OrchestrationRequest, type OrchestrationResponse } from '@url-shortener/shared/orchestration/index.ts'
import { OrchestrationRegistry, createUserDeletionHandler } from './orchestration/index.ts'
import { z } from 'zod'

const fastify = Fastify().withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Initialize Kafka
const kafka = createKafkaInstance({
  clientId: 'orchestrator-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create shared producer and consumer
const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'Orchestrator Service',
})

const consumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Orchestrator Service',
  groupId: CONSUMER_GROUPS.ORCHESTRATOR,
})

// Create consumer for saga results
const sagaResultsConsumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Orchestrator Service',
  groupId: 'orchestrator-saga-results-group',
})

// Initialize SAGA components
const sagaDatabase = new DrizzleSagaDatabase(db, sagasTable, sagaStepsTable)

const sagaEventPublisher = new KafkaSagaEventPublisher({
  publish: async (options) => {
    await producer.publishEvent(options.topic, options.event.type, options.event)
  }
})

// Use Kafka-based service client instead of HTTP
const sagaServiceClient = new KafkaSagaServiceClient(producer, sagaResultsConsumer)

const sagaOrchestrator = new SimpleSagaOrchestrator(
  'Orchestrator Service',
  sagaDatabase,
  sagaEventPublisher,
  sagaServiceClient
)

// Create orchestration registry and load handlers
const orchestrationRegistry = new OrchestrationRegistry()
createUserDeletionHandler(sagaOrchestrator)

// Consumer for orchestration requests
const orchestrationConsumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Orchestrator Service',
  groupId: 'orchestration-requests-group',
})

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'orchestrator' }
})

// Process orchestration requests via Kafka
async function processOrchestrationRequest(request: OrchestrationRequest): Promise<void> {
  const handler = orchestrationRegistry.getHandler(request.eventType)
  
  let response: OrchestrationResponse
  
  if (handler) {
    try {
      const result = await handler.handle(request)
      response = {
        requestId: request.requestId,
        success: result.success,
        sagaId: result.sagaId,
        errorMessage: result.errorMessage,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      response = {
        requestId: request.requestId,
        success: false,
        errorMessage,
        timestamp: new Date().toISOString(),
      }
    }
  } else {
    response = {
      requestId: request.requestId,
      success: false,
      errorMessage: `Unknown orchestration event type: ${request.eventType}`,
      timestamp: new Date().toISOString(),
    }
  }

  // Send response back to the requesting service
  await producer.publishEvent(
    TOPICS.ORCHESTRATION_RESPONSES,
    'orchestration-response',
    response,
    request.requestId
  )
}

// Get SAGA status
fastify.get('/saga/:sagaId/status', {
  schema: {
    params: z.object({
      sagaId: z.string()
    })
  }
}, async (request, reply) => {
  const { sagaId } = request.params
  const status = await sagaOrchestrator.getSagaStatus(sagaId)
  return reply.send(status)
})

// List all sagas
fastify.get('/saga', async (request, reply) => {
  const allSagas = await db.select().from(sagasTable)
  return reply.send(allSagas)
})

const start = async () => {
  try {
    // Connect Kafka producer
    await producer.connect()
    console.log('📡 Orchestrator Service: Kafka producer connected')
    
    // Connect saga results consumer first
    await sagaResultsConsumer.connect()
    console.log('📡 Orchestrator Service: Saga results consumer connected')
    
    // Initialize Kafka service client (which needs the consumer to be connected)
    await sagaServiceClient.initialize()
    console.log('📡 Orchestrator Service: Kafka saga service client initialized')
    
    // Start the saga results consumer
    await sagaResultsConsumer.start()
    console.log('📡 Orchestrator Service: Saga results consumer started')
    
    // Load orchestration handlers
    await orchestrationRegistry.loadHandlers()
    
    // Setup orchestration request consumer
    await orchestrationConsumer.connect()
    await orchestrationConsumer.subscribe([TOPICS.ORCHESTRATION_REQUESTS])
    
    orchestrationConsumer.registerEventHandler<OrchestrationRequest>('orchestration-request', processOrchestrationRequest)
    
    await orchestrationConsumer.start()
    console.log('📡 Orchestrator Service: Kafka orchestration consumer started')
    
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`🚀 Orchestrator Service: Service listening on port ${env.PORT}`)
    console.log('🎯 Orchestrator Service: Kafka-based orchestration initialized and ready')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Orchestrator Service: Shutting down...')
  try {
    await sagaServiceClient.shutdown()
    await sagaResultsConsumer.disconnect()
    await orchestrationConsumer.disconnect()
    await producer.disconnect()
    await fastify.close()
    console.log('✅ Orchestrator Service: Shutdown complete')
    process.exit(0)
  } catch (err) {
    console.error('❌ Orchestrator Service: Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

start()