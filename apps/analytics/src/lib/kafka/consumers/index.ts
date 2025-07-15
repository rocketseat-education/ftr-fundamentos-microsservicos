import type { ConsumedEventEntry } from '@microservices/shared/kafka/events/types.ts'
import { TOPICS } from '../config.ts'
import { clickEventConsumer } from './click-event-consumer.ts'
import { urlCreatedEventConsumer } from './url-created-event-consumer.ts'

// Registry of all consumed events
export const consumedEvents = {
  [clickEventConsumer.eventType]: {
    handler: clickEventConsumer.handler,
    topic: TOPICS.URL_EVENTS,
    description: clickEventConsumer.description,
  },
  [urlCreatedEventConsumer.eventType]: {
    handler: urlCreatedEventConsumer.handler,
    topic: TOPICS.URL_EVENTS,
    description: urlCreatedEventConsumer.description,
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