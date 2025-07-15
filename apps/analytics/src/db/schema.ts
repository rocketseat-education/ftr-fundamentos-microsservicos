import { createId } from '@paralleldrive/cuid2'
import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const clicks = pgTable('clicks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  shortCode: text('short_code').notNull().unique(),
  totalClicks: integer('total_clicks').default(0),
  uniqueClicks: integer('unique_clicks').default(0),
})

// Table for tracking processed events to ensure idempotency
export const processedEvents = pgTable('processed_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  ttlExpiresAt: timestamp('ttl_expires_at'),
})

// Table for tracking URL creation analytics
export const urlCreations = pgTable('url_creations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  eventId: text('event_id').notNull().unique(),
  urlId: text('url_id').notNull(),
  shortCode: text('short_code').notNull(),
  originalUrl: text('original_url').notNull(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').notNull(),
  metadata: jsonb('metadata'),
})
