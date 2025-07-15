import type { FastifyInstance } from 'fastify'
import { JWTService } from '../lib/jwt.ts'

export async function jwksRoutes(fastify: FastifyInstance) {
  const jwtService = JWTService.getInstance()

  // JWKS endpoint for Kong
  fastify.get('/.well-known/jwks.json', async () => {
    return await jwtService.getJWKS()
  })

  // Kong JWT key endpoint (for easier Kong configuration)
  fastify.get('/jwt/key', async () => {
    return { key: jwtService.getKongJWTKey() }
  })
}
