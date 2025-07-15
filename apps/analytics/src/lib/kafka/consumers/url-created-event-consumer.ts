import type { EventHandler } from '@microservices/shared/kafka/events/types.ts'
import { createId } from '@paralleldrive/cuid2'
import type { UrlCreatedEventPayload } from '@url-shortener/contracts'
import { sql } from 'drizzle-orm'
import { db } from '../../../db/connection.ts'
import { processedEvents, urlCreations } from '../../../db/schema.ts'

export const urlCreatedHandler: EventHandler<UrlCreatedEventPayload> = async (payload) => {
  console.log('Processing URL creation event:', payload)

  try {
    // Start a transaction for idempotent processing
    await db.transaction(async (tx) => {
      // Check if this event has already been processed
      const existingEvent = await tx
        .select()
        .from(processedEvents)
        .where(sql`${processedEvents.eventId} = ${payload.eventId}`)
        .limit(1)

      if (existingEvent.length > 0) {
        console.log(`Event ${payload.eventId} already processed, skipping`)
        return // Event already processed, skip
      }

      // Record that we're processing this event
      await tx.insert(processedEvents).values({
        eventId: payload.eventId,
        eventType: 'url-shortener.url-created',
        processedAt: new Date(),
        // Optional: set TTL for cleanup (e.g., 30 days from now)
        ttlExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      // Insert URL creation record
      await tx.insert(urlCreations).values({
        eventId: payload.eventId,
        urlId: payload.urlId,
        shortCode: payload.shortCode,
        originalUrl: payload.originalUrl,
        userId: payload.userId,
        createdAt: new Date(payload.createdAt),
        metadata: payload.metadata,
      })

      console.log(
        `Successfully processed URL creation for short code: ${payload.shortCode} (event: ${payload.eventId})`
      )
    })
  } catch (error) {
    console.error('Error processing URL creation event:', error)
    throw error // Re-throw to allow Kafka to handle retry logic
  }
}

export const urlCreatedEventConsumer = {
  eventType: 'url-shortener.url-created' as const,
  handler: urlCreatedHandler,
  description: 'Handles URL creation events from URL shortener service with idempotency',
}