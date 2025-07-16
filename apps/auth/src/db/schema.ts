import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'), // Soft delete support
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
})

// Generic SAGA tables for distributed transaction management
export const sagas = pgTable('sagas', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sagaType: text('saga_type').notNull(), // 'user-deletion', 'order-processing', etc.
  sagaId: text('saga_id').notNull(), // Business identifier (userId, orderId, etc.)
  status: text('status').notNull(), // 'pending', 'completed', 'failed', 'compensating'
  currentStep: integer('current_step').default(0), // Current step in the saga
  totalSteps: integer('total_steps').notNull(), // Total steps in this saga type
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'), // Flexible data for different saga types
  createdBy: text('created_by'), // Which service initiated the saga
  timeoutAt: timestamp('timeout_at'), // For handling timeouts
})

export const sagaSteps = pgTable('saga_steps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sagaId: text('saga_id')
    .notNull()
    .references(() => sagas.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  stepType: text('step_type').notNull(), // 'delete-urls', 'delete-analytics', etc.
  targetService: text('target_service').notNull(), // 'url-shortener', 'analytics', 'auth'
  status: text('status').notNull(), // 'pending', 'completed', 'failed', 'compensated'
  requestPayload: jsonb('request_payload'), // Data sent to service
  responsePayload: jsonb('response_payload'), // Response from service
  compensationPayload: jsonb('compensation_payload'), // Data needed for compensation
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
})
