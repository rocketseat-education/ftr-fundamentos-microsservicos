import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const urls = pgTable('urls', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  originalUrl: text('original_url').notNull(),
  shortCode: text('short_code').notNull().unique(),
  clickCount: integer('click_count').default(0),
  userId: text('user_id'), // User who created the URL (soft reference to auth service)
  deletedAt: timestamp('deleted_at'), // Soft delete support for SAGA compensation
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// SAGA tables for URL shortener service
export const sagas = pgTable('sagas', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sagaType: text('saga_type').notNull(),
  sagaId: text('saga_id').notNull(),
  status: text('status').notNull(),
  currentStep: integer('current_step').default(0),
  totalSteps: integer('total_steps').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdBy: text('created_by'),
  timeoutAt: timestamp('timeout_at'),
})

export const sagaSteps = pgTable('saga_steps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sagaId: text('saga_id')
    .notNull()
    .references(() => sagas.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  stepType: text('step_type').notNull(),
  targetService: text('target_service').notNull(),
  status: text('status').notNull(),
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  compensationPayload: jsonb('compensation_payload'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
})
