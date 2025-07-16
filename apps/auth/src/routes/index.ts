import type { FastifyInstance } from 'fastify'
import { healthCheck } from './health-check.ts'
import { getJwks } from './get-jwks.ts'
import { getJwtKey } from './get-jwt-key.ts'
import { registerUser } from './register-user.ts'
import { loginUser } from './login-user.ts'
import { refreshToken } from './refresh-token.ts'
import { logoutUser } from './logout-user.ts'
import { getUserProfile } from './get-user-profile.ts'
import { deleteUser } from './delete-user.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  // Register core business logic routes
  await fastify.register(healthCheck)
  await fastify.register(getJwks)
  await fastify.register(getJwtKey)
  await fastify.register(registerUser)
  await fastify.register(loginUser)
  await fastify.register(refreshToken)
  await fastify.register(logoutUser)
  await fastify.register(getUserProfile)
  await fastify.register(deleteUser) // Entry point for user deletion SAGA
  
  // SAGA operations are now handled via Kafka consumers
  // No need for HTTP endpoints for SAGA steps
}
