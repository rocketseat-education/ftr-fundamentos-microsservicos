import { SignJWT, jwtVerify, exportJWK, type JWTPayload } from 'jose'
import { env } from '../env.ts'

// Type for JWT payload
export interface AuthPayload extends JWTPayload {
  sub: string
  email: string
  iat?: number
  exp?: number
  iss?: string
  aud?: string
  type?: 'access' | 'refresh'
}

export class JWTService {
  private static instance: JWTService
  private secretKey: Uint8Array

  private constructor() {
    this.secretKey = new TextEncoder().encode(env.JWT_SECRET)
  }

  static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService()
    }
    return JWTService.instance
  }

  async createAccessToken(payload: {
    userId: string
    email: string
  }): Promise<string> {
    const jwt = await new SignJWT({
      sub: payload.userId,
      email: payload.email,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(this.secretKey)

    return jwt
  }

  async createRefreshToken(payload: {
    userId: string
    email: string
  }): Promise<string> {
    const jwt = await new SignJWT({
      sub: payload.userId,
      email: payload.email,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
      .sign(this.secretKey)

    return jwt
  }

  async verifyToken(token: string): Promise<AuthPayload> {
    const { payload } = await jwtVerify(token, this.secretKey, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    })

    return payload as AuthPayload
  }

  async getJWKS(): Promise<{ keys: any[] }> {
    // For HMAC (symmetric key), we need to use a different approach
    // In production, you might want to use RSA keys for better security
    // But for simplicity, we'll create a JWK that Kong can use
    const jwk = await exportJWK(this.secretKey)

    return {
      keys: [
        {
          ...jwk,
          kid: 'auth-key-1',
          alg: 'HS256',
          use: 'sig',
        },
      ],
    }
  }

  // For Kong JWT plugin, we need to provide the key in a specific format
  getKongJWTKey(): string {
    // Kong expects the key in base64 format for HMAC
    return Buffer.from(this.secretKey).toString('base64')
  }
}
