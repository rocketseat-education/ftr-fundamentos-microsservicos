# Microservices URL Shortener Project

## Project Overview

This project implements a URL shortener application using a microservices architecture with Node.js, TypeScript, and modern development practices. The system consists of three main services:

1. **Authentication Service** (Port 3002): Handles user registration, login, and JWT token management
2. **URL Shortener Service** (Port 3000): Handles URL creation, shortening, and redirection
3. **Analytics Service** (Port 3001): Tracks clicks and generates usage statistics

## Architecture

### Services
- **Authentication Service**: User registration, login, JWT token creation and management
- **URL Shortener Service**: Creates short URLs, handles redirects, validates URLs
- **Analytics Service**: Tracks clicks, generates usage statistics, stores analytics data
- **PostgreSQL Databases**: Each service has its own database instance for data isolation
- **Kafka**: Message broker for asynchronous inter-service communication
- **Kong API Gateway**: Routes requests to appropriate services and handles JWT authentication
- **Jaeger**: Distributed tracing system for monitoring and troubleshooting microservices

### Technology Stack
- **Runtime**: Node.js 22 LTS with experimental TypeScript stripping
- **Framework**: Fastify with Type Provider Zod
- **Database**: PostgreSQL with Drizzle ORM and `pg` driver for OpenTelemetry auto-instrumentation
- **Validation**: Zod for schema validation and environment variables
- **Observability**: OpenTelemetry SDK with Jaeger distributed tracing
- **Linting/Formatting**: Biome 2.0 with Ultracite configuration
- **Containerization**: Docker and Docker Compose
- **Message Broker**: Apache Kafka with Zookeeper
- **API Gateway**: Kong (database-less configuration)

## Project Structure

```
├── apps/
│   ├── url-shortener/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts          # Database schema definitions
│   │   │   │   └── connection.ts      # Database connection setup
│   │   │   ├── env.ts                 # Environment variables validation
│   │   │   ├── tracing.ts             # OpenTelemetry configuration
│   │   │   └── server.ts              # Main server entry point
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── biome.json
│   │   ├── drizzle.config.ts
│   │   ├── Dockerfile
│   │   ├── .gitignore
│   │   └── .env.example
│   └── analytics/
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts          # Analytics database schema
│       │   │   └── connection.ts      # Database connection setup
│       │   ├── env.ts                 # Environment variables validation
│       │   ├── tracing.ts             # OpenTelemetry configuration
│       │   └── server.ts              # Main server entry point
│       ├── package.json
│       ├── tsconfig.json
│       ├── biome.json
│       ├── drizzle.config.ts
│       ├── Dockerfile
│       ├── .gitignore
│       └── .env.example
├── kong/
│   └── kong.yml                   # Kong gateway configuration
├── docker-compose.yml
└── CLAUDE.md
```

## Node.js Built-in Features Used

### 1. Watch Mode (`--watch`)
- Automatically restarts the server when files change
- Used in development scripts for both services

### 2. Experimental TypeScript Stripping (`--experimental-strip-types`)
- Runs TypeScript files directly without compilation
- Eliminates build step for faster development

### 3. Environment File Loading (`--env-file`)
- Loads environment variables from `.env` files
- Supports separate test environment files

### 4. Built-in Test Runner (`--test`)
- Uses Node.js native test runner
- No external testing framework required

## Database Schema

Both services use text-based IDs with CUID2 for better performance, security, and URL-friendliness. Schemas are simplified with only essential timestamp columns and include strict validation.

### URL Shortener Service Schema
```typescript
export const urls = pgTable('urls', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  originalUrl: text('original_url').notNull(),
  shortCode: text('short_code').notNull().unique(),
  clickCount: integer('click_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Analytics Service Schema
```typescript
export const clicks = pgTable('clicks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  shortCode: text('short_code').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  country: text('country'),
  city: text('city'),
  referer: text('referer'),
  metadata: jsonb('metadata'),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

export const urlStats = pgTable('url_stats', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  shortCode: text('short_code').notNull().unique(),
  totalClicks: integer('total_clicks').default(0),
  uniqueClicks: integer('unique_clicks').default(0),
});
```

## Distributed Tracing with OpenTelemetry

### Overview
The project uses OpenTelemetry for distributed tracing with Jaeger as the backend. This provides comprehensive observability across the microservices architecture, allowing you to trace requests as they flow through different services.

### Architecture
- **OpenTelemetry SDK**: Automatically instruments HTTP requests, database queries, and Kafka operations
- **OTLP HTTP Exporter**: Modern OpenTelemetry Protocol for sending traces to Jaeger
- **Jaeger**: Collects, stores, and visualizes trace data via OTLP
- **Auto-instrumentation**: Automatically traces Fastify routes, PostgreSQL queries (via `pg` driver), and Kafka operations

### Key Components

#### 1. OpenTelemetry Configuration (`tracing.ts`)
Each service has its own tracing configuration that:
- Initializes the OpenTelemetry SDK with service-specific metadata
- Configures OTLP HTTP exporter for modern trace collection
- Enables auto-instrumentation for common libraries (HTTP, database, Kafka)
- Sets up resource attributes for service identification

#### 2. OTLP and Jaeger Integration
- **OTLP HTTP Endpoint**: http://localhost:4318/v1/traces (modern OpenTelemetry Protocol)
- **Jaeger UI**: Available at http://localhost:16686
- **Backward Compatibility**: Jaeger also accepts legacy endpoints (14268, 14250)

#### 3. Auto-instrumentation Features
- **HTTP Requests**: Automatic tracing of incoming and outgoing HTTP requests
- **Database Queries**: PostgreSQL queries traced via `pg` driver instrumentation
- **Kafka Operations**: Producer and consumer operations automatically traced
- **Error Tracking**: Automatic error capture and span marking
- **Performance Metrics**: Response times, queue times, and throughput metrics

### Database Driver Migration
The project migrated from the `postgres` package to the `pg` package specifically to enable OpenTelemetry auto-instrumentation:

**Before (postgres package):**
```typescript
import postgres from 'postgres';
const connection = postgres(env.DATABASE_URL);
```

**After (pg package):**
```typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: env.DATABASE_URL });
```

This change enables automatic tracing of all database operations without additional code changes.

### Trace Correlation
- **Service-to-Service**: Traces automatically correlate requests across microservices
- **Request Context**: Each request maintains context through the entire call chain
- **Error Correlation**: Errors are automatically linked to their originating traces
- **Performance Analysis**: Identify bottlenecks and latency issues across services

### Development Workflow
1. **Start Infrastructure**: `docker-compose up -d` includes Jaeger automatically
2. **View Traces**: Navigate to http://localhost:16686 for Jaeger UI
3. **Generate Traffic**: Make requests to your services to generate traces
4. **Analyze Performance**: Use Jaeger to identify slow operations and errors

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
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318/v1/traces)

### URL Shortener Service
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation
- `OTEL_SERVICE_NAME`: OpenTelemetry service name (default: url-shortener)
- `OTEL_SERVICE_VERSION`: OpenTelemetry service version (default: 1.0.0)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318/v1/traces)

### Analytics Service
- `PORT`: Server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation
- `OTEL_SERVICE_NAME`: OpenTelemetry service name (default: analytics)
- `OTEL_SERVICE_VERSION`: OpenTelemetry service version (default: 1.0.0)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OTLP HTTP endpoint (default: http://localhost:4318/v1/traces)

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
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

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

5. **Run database migrations**
   ```bash
   cd apps/url-shortener && npm run db:push
   cd ../analytics && npm run db:push
   ```

6. **Start microservices locally**
   ```bash
   # Terminal 1 - URL Shortener
   cd apps/url-shortener && npm run dev
   
   # Terminal 2 - Analytics
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

# Run migrations
cd apps/auth && npm run db:push
cd ../url-shortener && npm run db:push
cd ../analytics && npm run db:push

# Start services locally (in separate terminals)
cd apps/auth && npm run dev
cd apps/url-shortener && npm run dev
cd apps/analytics && npm run dev
```

This setup provides a solid foundation for a microservices-based URL shortener application with modern Node.js practices, comprehensive tooling, and enterprise-grade security through JWKS authentication, asynchronous communication, and proper service isolation.