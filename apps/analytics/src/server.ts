import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { setupAnalyticsErrorHandler } from './lib/error-handler.ts'
import { kafkaConsumer } from './lib/kafka/index.ts'
import { registerRoutes } from './routes/index.ts'
import { analyticsSagaStepConsumer } from './lib/kafka/saga-step-consumer.ts'

const fastify = Fastify().withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setup global error handler
setupAnalyticsErrorHandler(fastify)

// Register all routes
await fastify.register(registerRoutes)

const start = async () => {
  try {
    // Initialize Kafka consumers
    await kafkaConsumer.initialize()
    await kafkaConsumer.connect()
    await kafkaConsumer.subscribe()
    await kafkaConsumer.start()
    
    // Initialize SAGA step consumer
    await analyticsSagaStepConsumer.initialize()

    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Analytics service running on port ${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...')
  try {
    await analyticsSagaStepConsumer.shutdown()
    await kafkaConsumer.disconnect()
    await fastify.close()
    console.log('Shutdown complete')
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

start()
