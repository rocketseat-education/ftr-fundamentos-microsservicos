// Common event types and utilities
export type EventHandler<T = any> = (payload: T) => Promise<void>
export type EventPublisher<T = any> = (payload: T) => Promise<void>

export interface ConsumedEventEntry<T = any> {
  handler: EventHandler<T>
  topic: string
  description?: string
}

export interface ProducedEventEntry<T = any> {
  publisher: EventPublisher<T>
  topic: string
  description?: string
}

// Generic registry utilities
export function getRegisteredEventTypes<T extends Record<string, any>>(
  registry: T
): (keyof T)[] {
  return Object.keys(registry) as (keyof T)[]
}

export function getEventTopic<T extends Record<string, { topic: string }>>(
  registry: T,
  eventType: keyof T
): string | undefined {
  return registry[eventType]?.topic
}

export function getEventDescription<T extends Record<string, { description?: string }>>(
  registry: T,
  eventType: keyof T
): string {
  return registry[eventType]?.description || 'No description available'
}

export function getUniqueTopics<T extends Record<string, { topic: string }>>(
  registry: T
): string[] {
  const topics = Object.values(registry).map(entry => entry.topic)
  return [...new Set(topics)]
}