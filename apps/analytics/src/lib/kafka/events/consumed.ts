import type {
  ConsumedEventEntry,
  EventHandler,
} from '@microservices/shared/kafka/events/types.ts'
import { createId } from '@paralleldrive/cuid2'
import type { ClickEventPayload } from '@url-shortener/contracts'
import { sql } from 'drizzle-orm'
import { db } from '../../../db/connection.ts'
import { clicks, urlStats } from '../../../db/schema.ts'
import { TOPICS } from '../config.ts'

// Click event handler
const clickHandler: EventHandler<ClickEventPayload> = async (payload) => {
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

// Registry of all consumed events
export const consumedEvents = {
  'url-shortener.click': {
    handler: clickHandler,
    topic: TOPICS.URL_EVENTS,
    description: 'Handles click events from URL shortener service',
  },
} as const satisfies Record<string, ConsumedEventEntry>

export type ConsumedEventType = keyof typeof consumedEvents

/**
 * Get all registered event types
 */
export const getRegisteredEvents = (): ConsumedEventType[] => {
  return Object.keys(consumedEvents) as ConsumedEventType[]
}

/**
 * Get event handler by type
 */
export const getEventHandler = (eventType: ConsumedEventType) => {
  return consumedEvents[eventType]?.handler
}

/**
 * Get event description by type
 */
export const getEventDescription = (eventType: ConsumedEventType) => {
  return consumedEvents[eventType]?.description || 'No description available'
}

/**
 * Get unique topics from registered events
 */
export const getRegisteredTopics = (): string[] => {
  const topics = Object.values(consumedEvents).map((entry) => entry.topic)
  return [...new Set(topics)]
}
