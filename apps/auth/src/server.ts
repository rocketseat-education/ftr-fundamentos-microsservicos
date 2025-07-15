// Import tracing first to ensure proper instrumentation
import './tracing.ts'

import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env.ts'
import { setupErrorHandler } from './lib/error-handler.ts'
import { registerRoutes } from './routes/index.ts'

const fastify = Fastify({
  logger: true,
}).withTypeProvider<ZodTypeProvider>()

fastify.setValidatorCompiler(validatorCompiler)
fastify.setSerializerCompiler(serializerCompiler)

// Setup global error handler
setupErrorHandler(fastify)

// Register all routes
await fastify.register(registerRoutes)

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Auth service running on port ${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
