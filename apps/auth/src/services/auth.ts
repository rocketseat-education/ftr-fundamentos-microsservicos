import { eq, and } from 'drizzle-orm'
import { db } from '../db/connection.ts'
import { users, refreshTokens } from '../db/schema.ts'
import { PasswordService } from '../lib/password.ts'
import { JWTService } from '../lib/jwt.ts'

export interface RegisterRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

export class AuthService {
  private jwtService: JWTService

  constructor() {
    this.jwtService = JWTService.getInstance()
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, request.email))

    if (existingUser.length > 0) {
      throw new Error('User already exists with this email')
    }

    // Hash password
    const passwordHash = await PasswordService.hash(request.password)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: request.email,
        passwordHash,
        firstName: request.firstName,
        lastName: request.lastName,
      })
      .returning()

    // Generate tokens
    const accessToken = await this.jwtService.createAccessToken({
      userId: newUser.id,
      email: newUser.email,
    })

    const refreshToken = await this.jwtService.createRefreshToken({
      userId: newUser.id,
      email: newUser.email,
    })

    // Store refresh token
    await this.storeRefreshToken(newUser.id, refreshToken)

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
      },
    }
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, request.email))

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await PasswordService.verify(
      request.password,
      user.passwordHash
    )

    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is disabled')
    }

    // Generate tokens
    const accessToken = await this.jwtService.createAccessToken({
      userId: user.id,
      email: user.email,
    })

    const refreshToken = await this.jwtService.createRefreshToken({
      userId: user.id,
      email: user.email,
    })

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
    }
  }

  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string }> {
    // Verify refresh token
    const payload = await this.jwtService.verifyToken(refreshToken)

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token')
    }

    // Check if refresh token exists in database and is not revoked
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          eq(refreshTokens.userId, payload.sub!)
        )
      )

    if (!storedToken || storedToken.revokedAt) {
      throw new Error('Invalid or revoked refresh token')
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      throw new Error('Refresh token expired')
    }

    // Generate new access token
    const accessToken = await this.jwtService.createAccessToken({
      userId: payload.sub!,
      email: payload.email,
    })

    return { accessToken }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.token, refreshToken))
  }

  async getUserProfile(userId: string) {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))

    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  private async storeRefreshToken(
    userId: string,
    token: string
  ): Promise<void> {
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt,
    })
  }
}
