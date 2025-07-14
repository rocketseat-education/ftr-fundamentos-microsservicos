# Microservices URL Shortener Project

## Project Overview

This project implements a URL shortener application using a microservices architecture with Node.js, TypeScript, and modern development practices. The system consists of two main services:

1. **URL Shortener Service** (Port 3000): Handles URL creation, shortening, and redirection
2. **Analytics Service** (Port 3001): Tracks clicks and generates usage statistics

## Architecture

### Services
- **URL Shortener Service**: Creates short URLs, handles redirects, validates URLs
- **Analytics Service**: Tracks clicks, generates usage statistics, stores analytics data
- **PostgreSQL Databases**: Each service has its own database instance for data isolation
- **Kafka**: Message broker for asynchronous inter-service communication
- **Kong API Gateway**: Routes requests to appropriate services and handles authentication via JWKS

### Technology Stack
- **Runtime**: Node.js 22 LTS with experimental TypeScript stripping
- **Framework**: Fastify with Type Provider Zod
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod for schema validation and environment variables
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

## Environment Variables

Environment variables are validated using Zod schemas. Authentication is handled via JWKS endpoints rather than shared secrets for better security and scalability.

### URL Shortener Service
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation

### Analytics Service
- `PORT`: Server port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `KAFKA_BROKERS`: Kafka broker addresses
- `NODE_ENV`: Environment (development/production/test)
- `JWKS_ENDPOINT`: JWKS endpoint for JWT validation

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
- `url-shortener-db`: PostgreSQL for URL shortener
- `analytics-db`: PostgreSQL for analytics
- `kafka`: Apache Kafka message broker
- `zookeeper`: Kafka coordination service
- `kong`: API Gateway

### Ports
- `5432`: PostgreSQL databases (url-shortener-db, analytics-db)
- `8000`: Kong Gateway (HTTP)
- `8001`: Kong Admin API
- `9092`: Kafka

### Local Development
The microservices (`url-shortener` and `analytics`) are designed to run locally during development:
- Use `npm run dev` in each service directory for development
- Services connect to Docker Compose infrastructure (databases, Kafka, Kong)
- Kong is configured with host networking to proxy requests to local services

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

- Structured logging with Fastify
- Request correlation IDs for distributed tracing
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
cd apps/url-shortener && npm run db:push
cd ../analytics && npm run db:push

# Start services locally (in separate terminals)
cd apps/url-shortener && npm run dev
cd apps/analytics && npm run dev
```

This setup provides a solid foundation for a microservices-based URL shortener application with modern Node.js practices, comprehensive tooling, and enterprise-grade security through JWKS authentication, asynchronous communication, and proper service isolation.