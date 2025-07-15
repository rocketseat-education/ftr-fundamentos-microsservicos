# Persistência Distribuída em Arquitetura de Microsserviços

## Visão Geral

Este documento explica como implementamos persistência distribuída seguindo o padrão **Database per Service**, onde cada microsserviço possui seu próprio banco de dados independente. Esta abordagem garante baixo acoplamento e alta coesão entre os serviços.

## Arquitetura de Persistência

```mermaid
graph TD
    subgraph "Serviço de Autenticação"
        A[Auth Service :3002] --> B[(Auth PostgreSQL :5432)]
    end
    
    subgraph "Serviço URL Shortener"
        C[URL Service :3000] --> D[(URL PostgreSQL :5433)]
    end
    
    subgraph "Serviço Analytics"
        E[Analytics Service :3001] --> F[(Analytics PostgreSQL :5434)]
    end
    
    subgraph "Comunicação Inter-Serviços"
        G[Kafka Events] --> H[Eventual Consistency]
    end
    
    C -.->|URL Created Event| G
    C -.->|Click Event| G
    G -.->|Process Events| E
    
    style B fill:#e1f5fe
    style D fill:#e8f5e8
    style F fill:#fff3e0
```

## Padrões de Microsserviços Implementados

### 1. Database per Service

Cada serviço possui seu próprio banco de dados com esquemas específicos:

#### Serviço de Autenticação
```typescript
// apps/auth/src/db/schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
})
```

#### Serviço URL Shortener
```typescript
// apps/url-shortener/src/db/schema.ts
export const urls = pgTable('urls', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  originalUrl: text('original_url').notNull(),
  shortCode: text('short_code').notNull().unique(),
  clickCount: integer('click_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

#### Serviço Analytics
```typescript
// apps/analytics/src/db/schema.ts
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
})

export const urlStats = pgTable('url_stats', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  shortCode: text('short_code').notNull().unique(),
  totalClicks: integer('total_clicks').default(0),
  uniqueClicks: integer('unique_clicks').default(0),
})
```

### 2. Eventual Consistency

Como cada serviço tem seu próprio banco, utilizamos eventos assíncronos para manter consistência eventual:

```mermaid
sequenceDiagram
    participant U as URL Service
    participant K as Kafka
    participant A as Analytics Service
    
    U->>U: Criar URL no banco local
    U->>K: Publicar URL Created Event
    K->>A: Consumir evento
    A->>A: Processar e armazenar analytics
    
    Note over U,A: Consistência Eventual
```

### 3. Connection Pool per Service

Cada serviço gerencia seu próprio pool de conexões:

```typescript
// apps/auth/src/db/connection.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '../env.ts'
import * as schema from './schema.ts'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const db = drizzle(pool, { schema })
```

## Configuração de Ambientes

### Docker Compose Configuration
```yaml
# docker-compose.yml
services:
  auth-db:
    image: postgres:16
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - auth_data:/var/lib/postgresql/data

  url-shortener-db:
    image: postgres:16
    environment:
      POSTGRES_DB: url_shortener
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - url_data:/var/lib/postgresql/data

  analytics-db:
    image: postgres:16
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5434:5432"
    volumes:
      - analytics_data:/var/lib/postgresql/data
```

### Environment Variables per Service
```bash
# apps/auth/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth

# apps/url-shortener/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/url_shortener

# apps/analytics/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/analytics
```

## Gestão de Schema e Migrações

### 1. Schema Evolution Independent

Cada serviço evolui seu schema independentemente:

```typescript
// apps/analytics/src/db/schema.ts - Exemplo de tabela para idempotência
export const processedEvents = pgTable('processed_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  ttlExpiresAt: timestamp('ttl_expires_at'),
})
```

### 2. Drizzle Migration per Service

```bash
# Cada serviço tem suas próprias migrações
cd apps/auth && npm run db:generate && npm run db:migrate
cd apps/url-shortener && npm run db:generate && npm run db:migrate
cd apps/analytics && npm run db:generate && npm run db:migrate
```

### 3. Configuration per Service

```typescript
// apps/auth/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

## Patterns de Acesso a Dados

### 1. Repository Pattern

Cada serviço encapsula acesso a dados:

```typescript
// apps/url-shortener/src/routes/create-url.ts:62-71
const [createdUrl] = await db
  .insert(urls)
  .values({
    id: urlId,
    originalUrl: url,
    shortCode,
    clickCount: 0,
  })
  .returning()
```

### 2. Transactional Operations

Operações atômicas dentro de cada serviço:

```typescript
// apps/analytics/src/lib/kafka/consumers/url-created-event-consumer.ts:12-44
await db.transaction(async (tx) => {
  // Verificar se evento já foi processado (idempotência)
  const existingEvent = await tx
    .select()
    .from(processedEvents)
    .where(sql`${processedEvents.eventId} = ${payload.eventId}`)
    .limit(1)

  if (existingEvent.length > 0) {
    console.log(`Event ${payload.eventId} already processed, skipping`)
    return
  }

  // Marcar evento como processado
  await tx.insert(processedEvents).values({
    eventId: payload.eventId,
    eventType: 'url-shortener.url-created',
    processedAt: new Date(),
    ttlExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  })

  // Inserir registro de criação de URL
  await tx.insert(urlCreations).values({
    eventId: payload.eventId,
    urlId: payload.urlId,
    shortCode: payload.shortCode,
    originalUrl: payload.originalUrl,
    userId: payload.userId,
    createdAt: new Date(payload.createdAt),
    metadata: payload.metadata,
  })
})
```

### 3. Event Sourcing Pattern (Parcial)

O serviço de analytics mantém histórico de eventos:

```typescript
// apps/analytics/src/db/schema.ts
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

## Vantagens da Persistência Distribuída

### 1. Autonomia dos Serviços
- **Independent Deployment**: Cada serviço pode ser deployado independentemente
- **Technology Diversity**: Cada serviço pode usar diferentes tecnologias de banco
- **Schema Evolution**: Mudanças de schema não afetam outros serviços

### 2. Escalabilidade
- **Horizontal Scaling**: Cada banco pode ser escalado independentemente
- **Resource Optimization**: Recursos podem ser alocados conforme demanda do serviço
- **Performance Isolation**: Performance de um serviço não afeta outros

### 3. Resilência
- **Failure Isolation**: Falha em um banco não afeta outros serviços
- **Backup Strategies**: Estratégias de backup específicas por serviço
- **Recovery Independence**: Recuperação pode ser feita por serviço

## Desafios e Soluções

### 1. Consistência de Dados

**Desafio**: Transações ACID entre serviços
**Solução**: Eventual Consistency via eventos

```typescript
// apps/url-shortener/src/routes/create-url.ts:73-89
// Primeiro: salvar no banco local (consistência forte)
const [createdUrl] = await db.insert(urls).values({...}).returning()

// Depois: publicar evento (eventual consistency)
publishUrlCreatedEvent({
  eventId: createId(),
  urlId: createdUrl.id,
  shortCode: createdUrl.shortCode,
  originalUrl: createdUrl.originalUrl,
  userId,
  createdAt: createdUrl.createdAt.toISOString(),
}).catch((error) => {
  console.error('Failed to publish URL creation event:', error)
})
```

### 2. Queries Cross-Service

**Desafio**: Consultas que precisam de dados de múltiplos serviços
**Solução**: 
- Duplicação controlada de dados via eventos
- API Composition Pattern
- CQRS com Read Models

```typescript
// Analytics service mantém cópia dos dados necessários
// apps/analytics/src/db/schema.ts
export const urlCreations = pgTable('url_creations', {
  // Dados duplicados do URL service para queries eficientes
  urlId: text('url_id').notNull(),
  shortCode: text('short_code').notNull(),
  originalUrl: text('original_url').notNull(),
  userId: text('user_id'),
})
```

### 3. Referential Integrity

**Desafio**: Foreign keys entre serviços
**Solução**: 
- Eventual consistency validation
- Compensating transactions
- Soft references com IDs

```typescript
// Usar IDs como soft references, não foreign keys
// apps/analytics/src/db/schema.ts
export const clicks = pgTable('clicks', {
  shortCode: text('short_code').notNull(), // Soft reference para URL service
  userId: text('user_id'), // Soft reference para Auth service
})
```

## Monitoramento e Observabilidade

### 1. Database Health Checks

```typescript
// Cada serviço monitora sua própria conexão
export async function checkDatabaseHealth() {
  try {
    await db.execute(sql`SELECT 1`)
    return { status: 'healthy' }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}
```

### 2. Connection Pool Monitoring

```typescript
// Monitoramento de pool de conexões
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  // Eventos para monitoramento
  log: (level, msg) => console.log(`Pool ${level}: ${msg}`),
})

pool.on('connect', () => console.log('Client connected'))
pool.on('error', (err) => console.error('Pool error:', err))
```

### 3. Query Performance

Cada serviço pode implementar métricas específicas:
- Tempo de resposta por query
- Número de conexões ativas
- Taxa de erro por operação

A persistência distribuída é fundamental para manter a autonomia dos microsserviços, permitindo que cada serviço evolua independentemente while maintaining data consistency through eventual consistency patterns.