import type { EventPublisher } from '@url-shortener/shared/kafka/events/types.ts'
import type { ClickEventPayload } from '@url-shortener/contracts'
import { kafkaProducer } from '../producer.ts'

export const publishClickEvent: EventPublisher<ClickEventPayload> = async (
  payload: any
) => {
  await kafkaProducer.publishEvent('url-shortener.click', payload)
}

export const clickEventProducer = {
  eventType: 'url-shortener.click' as const,
  publisher: publishClickEvent,
  description: 'Publishes click events when URLs are accessed',
}