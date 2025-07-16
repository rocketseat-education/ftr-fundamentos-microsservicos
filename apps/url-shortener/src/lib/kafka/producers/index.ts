import type { ProducedEventEntry } from '@url-shortener/shared/kafka/events/types.ts'
import { TOPICS } from '../config.ts'
import { clickEventProducer, publishClickEvent } from './click-event-producer.ts'
import { urlCreatedEventProducer, publishUrlCreatedEvent } from './url-created-event-producer.ts'

// Registry of all produced events
export const producedEvents = {
  [clickEventProducer.eventType]: {
    publisher: clickEventProducer.publisher,
    topic: TOPICS.URL_EVENTS,
    description: clickEventProducer.description,
  },
  [urlCreatedEventProducer.eventType]: {
    publisher: urlCreatedEventProducer.publisher,
    topic: TOPICS.URL_EVENTS,
    description: urlCreatedEventProducer.description,
  },
} as const satisfies Record<string, ProducedEventEntry>

export type ProducedEventType = keyof typeof producedEvents

// Export the event publishers for direct use
export { publishClickEvent, publishUrlCreatedEvent }

// Local utility functions
export const getRegisteredEventTypes = (): ProducedEventType[] => {
  return Object.keys(producedEvents) as ProducedEventType[]
}

export const getEventPublisher = (eventType: ProducedEventType) => {
  return producedEvents[eventType]?.publisher
}

export const getEventTopic = (eventType: ProducedEventType): string => {
  return producedEvents[eventType]?.topic || ''
}

export const getEventDescription = (eventType: ProducedEventType): string => {
  return producedEvents[eventType]?.description || ''
}

export const getPublisherTopics = (): string[] => {
  return [...new Set(Object.values(producedEvents).map(event => event.topic))]
}