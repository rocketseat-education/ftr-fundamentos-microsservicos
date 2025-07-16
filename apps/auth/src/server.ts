import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { setupAuthErrorHandler } from './lib/error-handler.ts'
import { registerRoutes } from './routes/index.ts'
import { authOrchestrationService } from './lib/orchestration.ts'
import { authSagaStepConsumer } from './lib/kafka/saga-step-consumer.ts'

const fastify = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setup global error handler
setupAuthErrorHandler(fastify)

// Register all routes
await fastify.register(registerRoutes)

const start = async () => {
  try {
    // Initialize orchestration service and SAGA step consumer
    await authOrchestrationService.initialize()
    await authSagaStepConsumer.initialize()
    
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Auth service running on port ${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...')
  try {
    await authOrchestrationService.shutdown()
    await authSagaStepConsumer.shutdown()
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
