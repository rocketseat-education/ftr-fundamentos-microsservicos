import type { EventPublisher } from '@url-shortener/shared/kafka/events/types.ts'
import type { UrlCreatedEventPayload } from '@url-shortener/contracts'
import { kafkaProducer } from '../producer.ts'

export const publishUrlCreatedEvent: EventPublisher<UrlCreatedEventPayload> = async (
  payload: any
) => {
  await kafkaProducer.publishEvent('url-shortener.url-created', payload)
}

export const urlCreatedEventProducer = {
  eventType: 'url-shortener.url-created' as const,
  publisher: publishUrlCreatedEvent,
  description: 'Publishes URL creation events when URLs are created',
}