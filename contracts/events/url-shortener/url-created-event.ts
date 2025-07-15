import { z } from 'zod'

export const UrlCreatedEventPayload = z.object({
  eventId: z.string().describe('Unique event identifier for idempotency'),
  urlId: z.string().describe('The created URL unique identifier'),
  shortCode: z.string().describe('Generated short code'),
  originalUrl: z.string().url().describe('Target URL'),
  userId: z.string().optional().describe('User who created the URL'),
  createdAt: z.string().datetime().describe('URL creation timestamp'),
  metadata: z.record(z.any()).optional().describe('Additional context'),
})

export const UrlCreatedEvent = z.object({
  type: z.literal('url-shortener.url-created'),
  payload: UrlCreatedEventPayload,
})

export type UrlCreatedEventPayload = z.infer<typeof UrlCreatedEventPayload>
export type UrlCreatedEvent = z.infer<typeof UrlCreatedEvent>