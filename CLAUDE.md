# Microservices URL Shortener Project

## Overview

URL shortener microservices architecture with Node.js 22, TypeScript, and modern practices.

### Services
1. **Authentication** (Port 3002): JWT-based auth with Argon2id password hashing
2. **URL Shortener** (Port 3000): Short URL creation and redirection
3. **Analytics** (Port 3001): Click tracking and statistics
4. **Orchestrator** (Port 3003): SAGA pattern orchestration with database persistence

### Core Technologies
- **Runtime**: Node.js 22 with `--experimental-strip-types`
- **Framework**: Fastify + Zod validation
- **Database**: PostgreSQL with Drizzle ORM
- **Messaging**: Kafka for async communication
- **Gateway**: Kong for JWT validation and routing
- **Tracing**: OpenTelemetry + Jaeger
- **Code Quality**: Biome with Ultracite config

## Key Features

### Event-Driven Architecture
- **Idempotent Event Processing**: Exactly-once processing with `processedEvents` table
- **SAGA Pattern**: Distributed transactions for user deletion across services
- **Kafka Events**: Async communication between services

### Security
- **Argon2id**: OWASP-recommended password hashing
- **JWT + JWKS**: Token validation at Kong Gateway
- **User Context Injection**: Services receive authenticated user info via headers

### Development Experience  
- **TypeScript Stripping**: Run `.ts` files directly (no build step)
- **Watch Mode**: Auto-restart on file changes
- **Native Test Runner**: Built-in Node.js testing

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Install dependencies (in each service)
cd apps/auth && npm install
cd ../url-shortener && npm install  
cd ../analytics && npm install
cd ../orchestrator && npm install

# 3. Run migrations
cd apps/auth && npm run db:push
cd ../url-shortener && npm run db:push
cd ../analytics && npm run db:push
cd ../orchestrator && npm run db:push

# 4. Start services (separate terminals)
cd apps/auth && npm run dev
cd apps/url-shortener && npm run dev
cd apps/analytics && npm run dev
cd apps/orchestrator && npm run dev
```

## Environment Variables

### Common
- `PORT`: Service port
- `DATABASE_URL`: PostgreSQL connection
- `NODE_ENV`: development/production/test
- `OTEL_SERVICE_NAME`: Service name for tracing
- `OTEL_EXPORTER_OTLP_ENDPOINT`: http://localhost:4318

### Auth Service
- `JWT_SECRET`: Min 32 chars
- `JWT_ISSUER`: url-shortener-auth
- `JWT_AUDIENCE`: url-shortener-api

### URL/Analytics Services
- `KAFKA_BROKERS`: localhost:9092
- `JWKS_ENDPOINT`: http://localhost:3002/.well-known/jwks.json

## Authentication Architecture

### Overview
The project implements a centralized authentication system using JWT tokens with Kong Gateway handling token validation. This provides a secure, scalable authentication flow across all microservices.

### Authentication Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Auth Service   │    │  Kong Gateway   │
│                 │    │   (Port 3002)   │    │   (Port 8000)   │
│                 │    │                 │    │                 │
│ 1. Register/    │    │ 2. Validate     │    │ 3. Verify JWT   │
│    Login        │    │    Credentials  │    │ 4. Extract User │
│ 2. Get JWT      │    │ 3. Create JWT   │    │ 5. Route to     │
│ 3. Use JWT      │    │ 4. Return Token │    │    Services     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                                │              ┌─────────────────┐
                                │              │ URL Shortener   │
                                │              │   (Port 3000)   │
                                │              │ • Receives      │
                                │              │   User Context  │
                                │              └─────────────────┘
                                │                        │
                                │                        ▼
                                │              ┌─────────────────┐
                                │              │   Analytics     │
                                │              │   (Port 3001)   │
                                │              │ • Receives      │
                                │              │   User Context  │
                                │              └─────────────────┘
                                │
                                ▼
                      ┌─────────────────┐
                      │ PostgreSQL      │
                      │ Auth Database   │
                      │ • Users         │
                      │ • Refresh Tokens│
                      └─────────────────┘
```

### Authentication Components

#### 1. Authentication Service (Port 3002)
**Responsibilities:**
- User registration and login
- JWT token creation and signing
- Token refresh functionality
- User profile management
- Password hashing and verification

**Key Features:**
- **Secure Password Storage**: Uses Argon2id with OWASP-recommended parameters
- **JWT Token Management**: Creates access tokens (1h) and refresh tokens (30d)
- **Token Refresh**: Secure refresh token rotation
- **User Management**: Registration, login, profile access
- **JOSE Library**: Modern JWT implementation with proper security

**API Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - Token revocation
- `GET /auth/profile` - User profile (protected)
- `GET /.well-known/jwks.json` - JWKS endpoint for Kong

#### 2. Kong Gateway JWT Validation
**Responsibilities:**
- Validate JWT tokens on protected routes
- Extract user information from tokens
- Inject user context into service requests
- Block unauthorized requests

**Configuration:**
- **JWT Plugin**: Configured on URL Shortener and Analytics services
- **Token Validation**: Verifies signature, expiration, issuer, and audience
- **User Context**: Injects user ID and email into request headers
- **Security**: Centralized authentication at gateway level

#### 3. Database Schema
**Users Table:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Refresh Tokens Table:**
```sql
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);
```

### Security Features

#### 1. Password Hashing with Argon2id
The authentication service uses Argon2id, the winner of the Password Hashing Competition and current OWASP recommendation:

**Why Argon2id over bcrypt:**
- **Memory-hard Function**: Requires significant memory (64MB), making parallel attacks expensive
- **Resistance to GPU/ASIC attacks**: Better protection against specialized hardware attacks
- **Future-proof Design**: Built with modern attack vectors in mind
- **Configurable Security**: Time cost, memory cost, and parallelism can be adjusted
- **Side-channel Resistance**: Argon2id combines benefits of Argon2i and Argon2d

**Configuration:**
- **Memory Cost**: 64MB (2^16 KB) - balances security and performance
- **Time Cost**: 3 iterations - provides good security without excessive delay
- **Parallelism**: 1 thread - can be increased for better performance
- **Hash Length**: 32 bytes - sufficient for security requirements

#### 2. JWT Token Security
- **HMAC-SHA256 Signature**: Secure token signing
- **Token Expiration**: Access tokens expire in 1 hour
- **Refresh Token Rotation**: Secure refresh mechanism
- **Audience and Issuer Validation**: Prevent token misuse
- **Token Revocation**: Ability to revoke refresh tokens

#### 3. Password Security
- **Argon2id Hashing**: Winner of Password Hashing Competition, OWASP recommended
- **Memory-hard Function**: 64MB memory cost makes brute force attacks expensive
- **Configurable Parameters**: Time cost (3), memory cost (64MB), parallelism (1)
- **Password Validation**: Minimum 8 character requirement
- **No Plain Text Storage**: Passwords never stored in plain text
- **Hash Upgrades**: Built-in support for upgrading hash parameters over time

#### 4. Gateway Security
- **Centralized Authentication**: Single point of token validation
- **Request Filtering**: Unauthorized requests blocked at gateway
- **User Context Injection**: Services receive authenticated user info
- **CORS Configuration**: Proper cross-origin request handling

### Usage Examples

#### 1. User Registration
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### 2. User Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### 3. Accessing Protected Resources
```bash
curl -X GET http://localhost:8000/api/urls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Token Refresh
```bash
curl -X POST http://localhost:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Development Workflow

1. **Start Infrastructure**: `docker-compose up -d` (includes auth database)
2. **Install Dependencies**: `cd apps/auth && npm install`
3. **Run Database Migrations**: `npm run db:push`
4. **Start Auth Service**: `npm run dev`
5. **Register Test User**: Use POST /auth/register endpoint
6. **Get JWT Token**: Use POST /auth/login endpoint
7. **Test Protected Routes**: Use JWT token in Authorization header

## Event-Driven Architecture with Idempotency

### Overview
The project implements a robust event-driven architecture using Kafka for inter-service communication. A key feature is the idempotent processing of URL creation events, demonstrating exactly-once processing in distributed systems.

### Idempotency Implementation

#### **URL Creation Event Flow**
1. **URL Shortener Service** creates a URL and publishes `url-shortener.url-created` event
2. **Analytics Service** consumes the event and processes it idempotently
3. **Duplicate Detection** ensures each event is processed exactly once

#### **Key Components**

**Event Contract** (`contracts/events/url-shortener/url-created-event.ts`):
```typescript
export const UrlCreatedEventPayload = z.object({
  eventId: z.string().describe('Unique event identifier for idempotency'),
  urlId: z.string().describe('The created URL unique identifier'),
  shortCode: z.string().describe('Generated short code'),
  originalUrl: z.string().url().describe('Target URL'),
  userId: z.string().optional().describe('User who created the URL'),
  createdAt: z.string().datetime().describe('URL creation timestamp'),
  metadata: z.record(z.any()).optional().describe('Additional context'),
})
```

**Analytics Database Schema for Idempotency**:
```typescript
// Table for tracking processed events to ensure idempotency
export const processedEvents = pgTable('processed_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  ttlExpiresAt: timestamp('ttl_expires_at'),
})

// Table for tracking URL creation analytics
export const urlCreations = pgTable('url_creations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  eventId: text('event_id').notNull().unique(),
  urlId: text('url_id').notNull(),
  shortCode: text('short_code').notNull(),
  originalUrl: text('original_url').notNull(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').notNull(),
  metadata: jsonb('metadata'),
})
```

**Idempotent Event Handler** (`apps/analytics/src/lib/kafka/events/consumed.ts`):
```typescript
const urlCreatedHandler: EventHandler<UrlCreatedEventPayload> = async (payload) => {
  try {
    // Start a transaction for idempotent processing
    await db.transaction(async (tx) => {
      // Check if this event has already been processed
      const existingEvent = await tx
        .select()
        .from(processedEvents)
        .where(sql`${processedEvents.eventId} = ${payload.eventId}`)
        .limit(1)

      if (existingEvent.length > 0) {
        console.log(`Event ${payload.eventId} already processed, skipping`)
        return // Event already processed, skip
      }

      // Record that we're processing this event
      await tx.insert(processedEvents).values({
        eventId: payload.eventId,
        eventType: 'url-shortener.url-created',
        processedAt: new Date(),
        ttlExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
      })

      // Insert URL creation record
      await tx.insert(urlCreations).values({
        id: createId(),
        eventId: payload.eventId,
        urlId: payload.urlId,
        shortCode: payload.shortCode,
        originalUrl: payload.originalUrl,
        userId: payload.userId,
        createdAt: new Date(payload.createdAt),
        metadata: payload.metadata,
      })
    })
  } catch (error) {
    console.error('Error processing URL creation event:', error)
    throw error // Re-throw to allow Kafka to handle retry logic
  }
}
```

#### **Idempotency Features**
- **Unique Event IDs**: Each URL creation event includes a unique `eventId` using CUID2
- **Database Transactions**: All processing happens within database transactions for atomicity
- **Duplicate Detection**: Events are checked against the `processed_events` table before processing
- **Graceful Handling**: Duplicate events are logged and skipped without errors
- **TTL Support**: Optional cleanup mechanism for old processed events (30 days)
- **Race Condition Safety**: Database constraints prevent concurrent processing of the same event

#### **API Endpoints for Idempotency Monitoring**
- `GET /api/analytics/url-creations` - View processed URL creation events
- `GET /api/analytics/processed-events` - Monitor event processing with optional filtering
- `GET /api/analytics/overview` - Real-time analytics dashboard

### Testing Idempotency
1. **Create URLs**: Use `POST /api/urls` to create URLs and trigger events
2. **Monitor Processing**: Check `GET /api/analytics/processed-events` to see event processing
3. **Verify Deduplication**: Replay events to confirm they're not processed twice
4. **View Analytics**: Use `GET /api/analytics/url-creations` to see the results

## Environment Variables

Environment variables are validated using Zod schemas. Authentication is handled via JWT tokens with centralized validation at the Kong Gateway level.

### Authentication Service
- `PORT`: Server port (default: 3002)
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (development/production/test)
- `JWT_SECRET`: Secret key for JWT signing (minimum 32 characters)
- `JWT_ISSUER`: JWT issuer claim (default: url-shortener-auth)
- `JWT_AUDIENCE`: JWT audience claim (default: url-shortener-api)
- `JWT_EXPIRES_IN`: Access token expiration (default: 1h)
- `JWT_REFRESH_EXPIRES_IN`: Refresh token expiration (default: 30d)
- `OTEL_SERVICE_NAME`: OpenTelemetry service name (default: auth)
- `OTEL_SERVICE_VERSION`: OpenTelemetry service version (default: 1.0.0)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318)

### URL Shortener Service
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation
- `OTEL_SERVICE_NAME`: OpenTelemetry service name (default: url-shortener)
- `OTEL_SERVICE_VERSION`: OpenTelemetry service version (default: 1.0.0)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318)

### Analytics Service
- `PORT`: Server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation
- `OTEL_SERVICE_NAME`: OpenTelemetry service name (default: analytics)
- `OTEL_SERVICE_VERSION`: OpenTelemetry service version (default: 1.0.0)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318)

## Package.json Scripts

Both services include the following scripts that leverage Node.js built-in features like watch mode, TypeScript stripping, and native test runner:

```json
{
  "dev": "node --watch --experimental-strip-types --env-file=.env src/server.ts",
  "start": "node --experimental-strip-types --env-file=.env src/server.ts",
  "test": "node --test --experimental-strip-types --env-file=.env.test src/**/*.test.ts",
  "lint": "biome lint --write",
  "format": "biome format --write",
  "check": "biome check --write",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

## Route Architecture

The project implements a modular route architecture where each route is separated into its own file, following the single responsibility principle. This approach improves maintainability, testability, and code organization.

### Route File Naming Convention

Route files are named to clearly indicate the specific action they perform:

**Auth Service Routes:**
- `register-user.ts` - Handles user registration (POST /auth/register)
- `login-user.ts` - Handles user login (POST /auth/login)
- `refresh-token.ts` - Handles token refresh (POST /auth/refresh)
- `logout-user.ts` - Handles user logout (POST /auth/logout)
- `get-user-profile.ts` - Retrieves user profile (GET /auth/profile)
- `get-jwks.ts` - Provides JWKS endpoint (GET /.well-known/jwks.json)
- `get-jwt-key.ts` - Provides JWT key for Kong (GET /jwt/key)
- `health-check.ts` - Health check endpoint (GET /health)

**URL Shortener Service Routes:**
- `create-url.ts` - Creates new short URLs (POST /api/urls)
- `get-url.ts` - Retrieves URL by short code (GET /api/urls/:shortCode)
- `list-urls.ts` - Lists user's URLs with pagination (GET /api/urls)
- `update-url.ts` - Updates existing URL (PUT /api/urls/:id)
- `delete-url.ts` - Deletes URL (DELETE /api/urls/:id)
- `redirect-url.ts` - Handles URL redirection (GET /:shortCode)
- `health-check.ts` - Health check endpoint (GET /health)

**Analytics Service Routes:**
- `record-click.ts` - Records click events (POST /api/analytics/clicks)
- `get-url-analytics.ts` - Retrieves analytics for specific URL (GET /api/analytics/urls/:shortCode)
- `get-analytics-overview.ts` - Provides analytics overview (GET /api/analytics/overview)
- `get-realtime-analytics.ts` - Real-time analytics data (GET /api/analytics/realtime)
- `export-analytics.ts` - Exports analytics data (GET /api/analytics/export)
- `get-url-creations.ts` - Lists URL creation events (GET /api/analytics/url-creations)
- `get-processed-events.ts` - Lists processed events for idempotency tracking (GET /api/analytics/processed-events)
- `health-check.ts` - Health check endpoint (GET /health)

### Route Structure

Each route file follows a consistent structure:

```typescript
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
// Additional imports...

export const routeName: FastifyPluginAsyncZod = async (fastify) => {
  fastify.method(
    '/endpoint/path',
    {
      schema: {
        // Zod validation schemas
        body: z.object({...}),
        params: z.object({...}),
        querystring: z.object({...}),
        headers: z.object({...}),
        response: {
          statusCode: z.object({...})
        }
      }
    },
    async (request, reply) => {
      // Route handler logic
    }
  )
}
```

### Route Registration

All routes are registered in each service's `routes/index.ts` file:

```typescript
import type { FastifyInstance } from 'fastify'
import { routeName } from './route-file.ts'

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(routeName)
  // Additional route registrations...
}
```

### Benefits of This Architecture

1. **Single Responsibility**: Each file handles one specific route/action
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Individual routes can be tested in isolation
4. **Scalability**: Easy to add new routes without affecting existing ones
5. **Code Organization**: Clear separation of concerns
6. **Developer Experience**: Intuitive file naming makes navigation easier

## Development Setup

The project uses a monorepo structure with services organized in the `apps/` directory. Each service has its own .gitignore file and independent configuration.

### Prerequisites
- Node.js 22 LTS
- Docker and Docker Compose
- Git

### Setup Steps

1. **Clone and navigate to project**
   ```bash
   cd 09-fundamentos-microsservicos
   ```

2. **Setup environment files**
   ```bash
   cp apps/url-shortener/.env.example apps/url-shortener/.env
   cp apps/analytics/.env.example apps/analytics/.env
   # Edit .env files with your configuration
   ```

3. **Install dependencies**
   ```bash
   cd apps/url-shortener && npm install
   cd ../analytics && npm install
   ```

4. **Start infrastructure services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **Generate and run database migrations**
   ```bash
   # Generate migrations
   cd apps/auth && npm run db:generate
   cd ../url-shortener && npm run db:generate
   cd ../analytics && npm run db:generate
   
   # Apply migrations
   cd apps/auth && npm run db:migrate
   cd ../url-shortener && npm run db:migrate
   cd ../analytics && npm run db:migrate
   ```

6. **Start microservices locally**
   ```bash
   # Terminal 1 - Authentication Service
   cd apps/auth && npm run dev
   
   # Terminal 2 - URL Shortener
   cd apps/url-shortener && npm run dev
   
   # Terminal 3 - Analytics
   cd apps/analytics && npm run dev
   ```

## API Gateway Configuration

Kong is configured as a database-less gateway with centralized authentication handling:

- **URL Shortener**: `/api/urls/*` → `http://url-shortener:3000`
- **Analytics**: `/api/analytics/*` → `http://analytics:3001`

Gateway features:
- CORS enabled for all origins
- Request/Correlation ID tracking
- JWKS-based JWT validation
- Load balancing and health checks
- Rate limiting (can be added)

## Docker Services

### Services Included
- `auth-db`: PostgreSQL for authentication service
- `url-shortener-db`: PostgreSQL for URL shortener
- `analytics-db`: PostgreSQL for analytics
- `kafka`: Apache Kafka message broker
- `zookeeper`: Kafka coordination service
- `kong`: API Gateway with JWT authentication
- `jaeger`: Distributed tracing system

### Ports
- `5432`: PostgreSQL databases (url-shortener-db, analytics-db)
- `8000`: Kong Gateway (HTTP)
- `8001`: Kong Admin API
- `8002`: Kong Manager OSS (Native UI)
- `9092`: Kafka
- `16686`: Jaeger UI
- `14268`: Jaeger HTTP collector
- `14250`: Jaeger gRPC collector

### Local Development
The microservices (`auth`, `url-shortener`, and `analytics`) are designed to run locally during development:
- Use `npm run dev` in each service directory for development
- Services connect to Docker Compose infrastructure (databases, Kafka, Kong)
- Kong is configured with host networking to proxy requests to local services
- Authentication service runs on port 3002 and provides JWT tokens

## Development Conventions

### TypeScript Import Extensions
**IMPORTANT**: Always use `.ts` extensions for local file imports in TypeScript files. This ensures consistency with the experimental TypeScript stripping feature and avoids confusion about file extensions.

**Correct:**
```typescript
import { env } from './env.ts';
import * as schema from './schema.ts';
import './tracing.ts';
```

**Incorrect:**
```typescript
import { env } from './env.js';
import * as schema from './schema.js';
import './tracing.js';
```

### OpenTelemetry Configuration
Use standard OpenTelemetry environment variables for configuration:
- `OTEL_SERVICE_NAME`: Service name for tracing
- `OTEL_SERVICE_VERSION`: Service version for tracing
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint for trace export

This ensures compatibility with OpenTelemetry tooling and follows industry standards.

## Code Quality and Linting

Both services use Biome 2.1.1 with official Ultracite configuration for enterprise-grade code quality:
- **Biome 2.1.1**: Pinned exact version for consistency (as recommended by Ultracite)
- **Ultracite Package**: Official `ultracite` package with opinionated presets
- **Minimal Configuration**: Simple `extends: ["ultracite"]` setup
- **VS Code Integration**: Automatic formatting on save and code actions
- **Strict TypeScript**: `strictNullChecks` enabled for enhanced type safety
- **Enterprise Standards**: Comprehensive linting and formatting rules
- **Developer Experience**: Format on save and organize imports automatically

## Testing Strategy

- Unit tests using Node.js built-in test runner (no external dependencies)
- Integration tests with dedicated test databases
- Environment-specific test configuration with `.env.test` files
- Parallel test execution support
- TypeScript support via experimental stripping

## Security Considerations

- **Authentication**: JWT validation using JWKS endpoint from Kong (no shared secrets)
- **Input Validation**: Strict Zod schemas for all inputs and environment variables
- **Database Security**: Query parameterization with Drizzle ORM
- **ID Generation**: Text-based IDs using CUID2 for collision resistance and URL-safety
- **Network Security**: CORS configuration in Kong gateway
- **Observability**: Request ID tracking for security monitoring
- **Service Isolation**: Asynchronous communication via Kafka (no direct HTTP calls)

## Monitoring and Observability

### Distributed Tracing
- **Jaeger**: Full distributed tracing with automatic instrumentation
- **OpenTelemetry**: Industry-standard observability framework
- **Automatic Instrumentation**: HTTP, database, and Kafka operations traced automatically
- **Service Dependencies**: Visualize service interactions and dependencies
- **Performance Analysis**: Identify bottlenecks and latency issues

### Logging and Metrics
- **Structured Logging**: Fastify request/response logging
- **Trace Correlation**: Logs automatically correlated with distributed traces
- **Error Tracking**: Automatic error capture in traces
- **Performance Metrics**: Request duration, database query times, Kafka lag

### Health Monitoring
- Health check endpoints (to be implemented)
- Database connection monitoring per service
- Kafka consumer lag monitoring
- Centralized logging through Kong gateway

## SAGA Pattern Implementation

### Overview
The project implements a comprehensive SAGA pattern for managing distributed transactions across microservices. The primary use case is user account deletion, which requires coordinated actions across all three services.

### Architecture Design

#### **Generic SAGA Infrastructure**
The SAGA implementation uses a generic, metadata-driven approach that can handle multiple saga types:

- **Generic Database Tables**: Single `sagas` and `saga_steps` tables handle all saga types
- **Extensible Design**: New saga types can be added without schema changes
- **Metadata-Driven**: Flexible data storage using JSONB for different saga requirements
- **Type Safety**: Strong TypeScript contracts across all components

#### **Key Components**

**1. SAGA Orchestrator Service** (`/apps/orchestrator/`):
- Dedicated microservice for saga orchestration
- Database-backed saga persistence (PostgreSQL)
- Manages saga execution lifecycle and step coordination
- Implements compensation logic for failed sagas
- Provides HTTP API for saga management

**2. SAGA Consumer Infrastructure** (`/shared/saga/consumer.ts`):
- Shared consumer pattern for handling saga commands
- Used by all services to process saga steps
- Supports both forward and compensation operations
- Automatic result reporting back to orchestrator

**3. HTTP Orchestrator Client** (`/shared/saga/orchestrator.ts`):
- HTTP client for communicating with orchestrator service
- Used by services to initiate sagas
- Provides saga status checking and monitoring
- Lightweight alternative to in-memory orchestration

**4. SAGA Types and Contracts** (`/shared/saga/types.ts`):
- Common saga interfaces and types
- Shared across all services for consistency
- Type-safe saga command and result handling

### User Deletion SAGA Flow

#### **SAGA Definition**
```typescript
{
  type: 'user-deletion',
  timeout: 5 * 60 * 1000, // 5 minutes
  steps: [
    {
      stepNumber: 1,
      stepType: 'delete-user-urls',
      targetService: 'url-shortener',
      endpoint: 'url-shortener:/api/admin/users/:userId/urls',
      method: 'DELETE',
      compensation: {
        endpoint: 'url-shortener:/api/admin/users/:userId/urls/restore',
        method: 'POST',
      },
    },
    {
      stepNumber: 2,
      stepType: 'delete-user-analytics',
      targetService: 'analytics',
      endpoint: 'analytics:/api/admin/users/:userId/analytics',
      method: 'DELETE',
      compensation: {
        endpoint: 'analytics:/api/admin/users/:userId/analytics/restore',
        method: 'POST',
      },
    },
    {
      stepNumber: 3,
      stepType: 'delete-user-account',
      targetService: 'auth',
      endpoint: 'auth:/api/admin/users/:userId',
      method: 'DELETE',
      compensation: {
        endpoint: 'auth:/api/admin/users/:userId/restore',
        method: 'POST',
      },
    },
  ],
}
```

#### **Execution Flow**
1. **Initiation**: Admin calls `DELETE /admin/users/:userId` on auth service
2. **SAGA Creation**: Orchestrator creates saga instance and step records
3. **Step Execution**: Each step executes in sequence:
   - Delete user URLs (URL Shortener service)
   - Delete user analytics (Analytics service)
   - Delete user account (Auth service)
4. **Success**: SAGA completes successfully, all data is soft-deleted
5. **Failure**: If any step fails, compensation is triggered in reverse order

#### **Compensation Flow**
If any step fails, the SAGA orchestrator:
1. Marks the saga as 'failed' and 'compensating'
2. Executes compensation steps in reverse order
3. Restores data from previously completed steps
4. Publishes compensation events for monitoring

### Database Schema

#### **SAGA Tables** (Auth Service):
```sql
CREATE TABLE sagas (
  id TEXT PRIMARY KEY,
  saga_type TEXT NOT NULL,           -- 'user-deletion', 'order-processing', etc.
  saga_id TEXT NOT NULL,             -- Business identifier (userId, orderId, etc.)
  status TEXT NOT NULL,              -- 'pending', 'completed', 'failed', 'compensating'
  current_step INTEGER DEFAULT 0,    -- Current step in execution
  total_steps INTEGER NOT NULL,      -- Total steps in this saga type
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,                    -- Flexible data for different saga types
  created_by TEXT,                   -- Which service initiated the saga
  timeout_at TIMESTAMP               -- For handling timeouts
);

CREATE TABLE saga_steps (
  id TEXT PRIMARY KEY,
  saga_id TEXT NOT NULL REFERENCES sagas(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_type TEXT NOT NULL,           -- 'delete-urls', 'delete-analytics', etc.
  target_service TEXT NOT NULL,      -- 'url-shortener', 'analytics', 'auth'
  status TEXT NOT NULL,              -- 'pending', 'completed', 'failed', 'compensated'
  request_payload JSONB,             -- Data sent to service
  response_payload JSONB,            -- Response from service
  compensation_payload JSONB,        -- Data needed for compensation
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);
```

#### **Soft Delete Support**:
All services support soft delete for compensation:
- **Users**: `deleted_at` field for user soft delete
- **URLs**: `deleted_at` field for URL soft delete  
- **Analytics**: `deleted_at` field for clicks and URL creations

### API Endpoints

#### **SAGA Orchestrator Service (Port 3003)**:
- `POST /saga/start` - Start a new saga (takes sagaType, businessId, metadata)
- `GET /saga/:sagaId/status` - Get saga status and progress
- `GET /saga` - List all sagas
- `GET /health` - Health check endpoint

#### **SAGA Initiation (Auth Service)**:
- `DELETE /admin/users/:userId` - Triggers user deletion SAGA via orchestrator

#### **SAGA Step Endpoints**:
- `DELETE /api/admin/users/:userId/urls` - Delete user URLs
- `POST /api/admin/users/:userId/urls/restore` - Restore user URLs
- `DELETE /api/admin/users/:userId/analytics` - Delete user analytics
- `POST /api/admin/users/:userId/analytics/restore` - Restore user analytics
- `DELETE /api/admin/users/:userId` - Delete user account
- `POST /api/admin/users/:userId/restore` - Restore user account

### Event-Driven Monitoring

#### **SAGA Events** (Published to Kafka):
- `saga.started` - SAGA execution begins
- `saga.step.started` - Step execution begins
- `saga.step.completed` - Step execution completes
- `saga.completed` - SAGA successfully completes
- `saga.failed` - SAGA fails and compensation is triggered
- `saga.compensation.started` - Compensation begins
- `saga.compensation.completed` - Compensation completes
- `saga.timeout` - SAGA times out

#### **Event Contracts** (`/contracts/events/saga/saga-events.ts`):
All events use strongly typed Zod schemas for validation and type safety.

### Educational Value

This implementation demonstrates key distributed systems concepts:

1. **Distributed Transaction Management**: Coordinates actions across multiple services
2. **Compensation Pattern**: Implements rollback mechanisms for failed operations
3. **Event-Driven Architecture**: Uses Kafka for saga monitoring and observability
4. **Idempotency**: Ensures operations can be safely retried
5. **Soft Delete Pattern**: Enables compensation without data loss
6. **Generic Design**: Extensible infrastructure for multiple saga types
7. **Type Safety**: End-to-end type safety with TypeScript and Zod
8. **Observability**: Comprehensive event publishing for monitoring

### Testing the SAGA Pattern

#### **Successful Flow**:
```bash
# Trigger user deletion
curl -X DELETE http://localhost:8000/auth/admin/users/USER_ID

# Response includes sagaId for tracking
{
  "success": true,
  "sagaId": "cm123456789",
  "message": "User deletion process initiated"
}
```

#### **Monitoring SAGA Progress**:
Monitor saga progress through the orchestrator service:
- Check saga status: `GET http://localhost:3003/saga/SAGA_ID/status`
- List all sagas: `GET http://localhost:3003/saga`
- Check orchestrator database `sagas` table for current status
- Check orchestrator database `saga_steps` table for step-by-step progress
- Monitor Kafka events on the `saga-events` topic
- Use Jaeger for distributed tracing across services

#### **Failure Scenarios**:
Test compensation by:
1. Stopping a service during execution
2. Introducing database errors
3. Network timeouts
4. Invalid data scenarios

### Performance Considerations

- **Async Processing**: SAGA execution is non-blocking
- **Database Transactions**: Each step uses database transactions for consistency
- **Kafka Performance**: Event publishing is asynchronous and non-blocking
- **Timeout Handling**: Configurable timeouts prevent stuck sagas
- **Retry Logic**: Built-in retry mechanisms for transient failures

### Future SAGA Enhancements

- Additional saga types (order processing, payment handling)
- SAGA monitoring dashboard
- Automatic retry configuration
- Circuit breaker integration
- Saga replay capabilities
- Performance metrics collection

## Future Enhancements

- Route implementations for both services
- Authentication middleware
- Rate limiting
- Caching layer (Redis)
- Health check endpoints
- Metrics collection
- Circuit breaker pattern
- Distributed tracing

## Development Commands

### Authentication Service
```bash
cd apps/auth
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run check        # Run all checks
npm run db:generate  # Generate migrations
npm run db:push      # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

### URL Shortener Service
```bash
cd apps/url-shortener
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run check        # Run all checks
npm run db:generate  # Generate migrations
npm run db:push      # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

### Analytics Service
```bash
cd apps/analytics
npm run dev          # Start development server
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code
npm run check        # Run all checks
npm run db:generate  # Generate migrations
npm run db:push      # Apply migrations
npm run db:studio    # Open Drizzle Studio
```

### Docker Operations
```bash
docker-compose up -d              # Start infrastructure services
docker-compose down               # Stop infrastructure services
docker-compose logs -f <service>  # View service logs
docker-compose restart <service>  # Restart specific service
```

### Local Development Workflow
```bash
# Start infrastructure
docker-compose up -d

# Generate and run migrations
cd apps/auth && npm run db:generate && npm run db:migrate
cd ../url-shortener && npm run db:generate && npm run db:migrate
cd ../analytics && npm run db:generate && npm run db:migrate

# Start services locally (in separate terminals)
cd apps/auth && npm run dev
cd apps/url-shortener && npm run dev
cd apps/analytics && npm run dev
```

This setup provides a solid foundation for a microservices-based URL shortener application with modern Node.js practices, comprehensive tooling, and enterprise-grade security through JWKS authentication, asynchronous communication, and proper service isolation.

## Code Quality and Best Practices

### Inline Object Creation
The codebase follows modern JavaScript/TypeScript practices by creating objects inline rather than creating intermediate variables:

**Before:**
```typescript
const response = { id: url.id, name: url.name }
return reply.send(response)
```

**After:**
```typescript
return reply.send({ 
  id: url.id, 
  name: url.name 
})
```

### Database Operations
All services implement real database operations instead of mock data:

- **URL Shortener**: Full CRUD operations with PostgreSQL using Drizzle ORM
- **Analytics**: Real-time analytics with aggregated data from actual database queries
- **Authentication**: Secure user management with Argon2id password hashing
- **Click Tracking**: Atomic operations for incrementing click counts

### Type Safety
- **Zod Validation**: All API endpoints include Zod schema validation
- **TypeScript Strict Mode**: All packages compiled with strict TypeScript settings
- **Database Types**: Full type safety from database to API responses using Drizzle ORM
- **Event Contracts**: Strongly typed event schemas shared across services

### Performance Optimizations
- **Inline Object Creation**: Reduces memory allocation by avoiding intermediate variables
- **Database Transactions**: Atomic operations for data consistency and performance
- **Pagination**: All list endpoints support limit/offset pagination
- **Connection Pooling**: Efficient database connection management
- **Async Event Publishing**: Non-blocking event publishing to maintain response times

### Error Handling
- **Custom Error Classes**: Structured error handling with appropriate HTTP status codes
- **Database Error Recovery**: Proper error handling for database operations
- **Event Processing Errors**: Graceful error handling in Kafka consumers with retry logic
- **Validation Errors**: Clear error messages for API validation failures