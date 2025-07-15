import type { FastifyInstance } from 'fastify'
import { JWTService } from '../lib/jwt.ts'

export async function getJwks(fastify: FastifyInstance) {
  const jwtService = JWTService.getInstance()

  fastify.get('/.well-known/jwks.json', async () => {
    return await jwtService.getJWKS()
  })
}