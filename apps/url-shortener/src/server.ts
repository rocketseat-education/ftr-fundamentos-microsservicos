import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { setupUrlShortenerErrorHandler } from './lib/error-handler.ts'
import { kafkaProducer } from './lib/kafka/index.ts'
import { registerRoutes } from './routes/index.ts'
import { urlShortenerSagaStepConsumer } from './lib/kafka/saga-step-consumer.ts'

const fastify = Fastify().withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setup global error handler
setupUrlShortenerErrorHandler(fastify)

// Register all routes
await fastify.register(registerRoutes)

const start = async () => {
  try {
    // Initialize Kafka producer and SAGA step consumer
    await kafkaProducer.connect()
    await urlShortenerSagaStepConsumer.initialize()

    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`URL Shortener service running on port ${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...')
  try {
    await urlShortenerSagaStepConsumer.shutdown()
    await kafkaProducer.disconnect()
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
