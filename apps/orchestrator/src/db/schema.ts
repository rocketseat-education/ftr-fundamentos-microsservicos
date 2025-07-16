import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const sagas = pgTable('sagas', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
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
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sagaId: text('saga_id').notNull().references(() => sagas.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  stepType: text('step_type').notNull(),
  targetService: text('target_service').notNull(),
  status: text('status').notNull(),
  correlationId: text('correlation_id'),
  commandSentAt: timestamp('command_sent_at'),
  resultReceivedAt: timestamp('result_received_at'),
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  compensationPayload: jsonb('compensation_payload'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  timeoutAt: timestamp('timeout_at'),
})