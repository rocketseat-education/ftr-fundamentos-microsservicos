import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

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