import type { FastifyInstance } from 'fastify'
import { JWTService } from '../lib/jwt.ts'

export async function getJwtKey(fastify: FastifyInstance) {
  const jwtService = JWTService.getInstance()

  fastify.get('/jwt/key', async () => {
    return { key: jwtService.getKongJWTKey() }
  })
}