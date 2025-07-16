import type { EventHandler } from '@url-shortener/shared/kafka/events/types.ts'
import { createId } from '@paralleldrive/cuid2'
import type { ClickEventPayload } from '@url-shortener/contracts'
import { sql } from 'drizzle-orm'
import { db } from '../../../db/connection.ts'
import { clicks, urlStats } from '../../../db/schema.ts'

export const clickHandler: EventHandler<ClickEventPayload> = async (payload) => {
  console.log('Processing URL shortener click event:', payload)

  try {
    // Insert click record
    await db.insert(clicks).values({
      id: createId(),
      shortCode: payload.shortCode,
      userAgent: payload.userAgent,
      ipAddress: payload.ipAddress,
      country: payload.country,
      city: payload.city,
      referer: payload.referer,
      metadata: payload.metadata,
      clickedAt: new Date(payload.timestamp),
    })

    // Update URL stats using upsert
    await db
      .insert(urlStats)
      .values({
        id: createId(),
        shortCode: payload.shortCode,
        totalClicks: 1,
        uniqueClicks: 1,
      })
      .onConflictDoUpdate({
        target: urlStats.shortCode,
        set: {
          totalClicks: sql`${urlStats.totalClicks} + 1`,
          // For now, we'll increment unique clicks too
          // In a real implementation, you'd track unique users
          uniqueClicks: sql`${urlStats.uniqueClicks} + 1`,
        },
      })

    console.log(
      `Successfully processed click for short code: ${payload.shortCode}`
    )
  } catch (error) {
    console.error('Error processing click event:', error)
    throw error // Re-throw to allow Kafka to handle retry logic
  }
}

export const clickEventConsumer = {
  eventType: 'url-shortener.click' as const,
  handler: clickHandler,
  description: 'Handles click events from URL shortener service',
}