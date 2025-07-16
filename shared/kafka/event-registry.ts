import type { EventHandler } from './consumer.ts'

export interface EventProducer<T = any> {
  topic: string
  eventType: string
  handler: (payload: T) => Promise<void>
}

export interface EventConsumer<T = any> {
  topic: string
  eventType: string
  handler: EventHandler<T>
}

export class EventRegistry {
  private producers = new Map<string, EventProducer>()
  private consumers = new Map<string, EventConsumer>()
  private topicEventMap = new Map<string, Set<string>>()

  /**
   * Register a producer for an event type
   */
  registerProducer<T>(eventType: string, producer: EventProducer<T>): void {
    this.producers.set(eventType, producer)
    
    // Update topic-event mapping
    if (!this.topicEventMap.has(producer.topic)) {
      this.topicEventMap.set(producer.topic, new Set())
    }
    this.topicEventMap.get(producer.topic)!.add(eventType)
  }

  /**
   * Register a consumer for an event type
   */
  registerConsumer<T>(eventType: string, consumer: EventConsumer<T>): void {
    this.consumers.set(eventType, consumer)
    
    // Update topic-event mapping
    if (!this.topicEventMap.has(consumer.topic)) {
      this.topicEventMap.set(consumer.topic, new Set())
    }
    this.topicEventMap.get(consumer.topic)!.add(eventType)
  }

  /**
   * Get the topic for an event type
   */
  getEventTopic(eventType: string): string | undefined {
    const producer = this.producers.get(eventType)
    if (producer) return producer.topic
    
    const consumer = this.consumers.get(eventType)
    if (consumer) return consumer.topic
    
    return undefined
  }

  /**
   * Get all registered producer event types
   */
  getProducerEventTypes(): string[] {
    return Array.from(this.producers.keys())
  }

  /**
   * Get all registered consumer event types
   */
  getConsumerEventTypes(): string[] {
    return Array.from(this.consumers.keys())
  }

  /**
   * Get all topics that have producers
   */
  getProducerTopics(): string[] {
    return Array.from(new Set(
      Array.from(this.producers.values()).map(p => p.topic)
    ))
  }

  /**
   * Get all topics that have consumers
   */
  getConsumerTopics(): string[] {
    return Array.from(new Set(
      Array.from(this.consumers.values()).map(c => c.topic)
    ))
  }

  /**
   * Get all event types for a specific topic
   */
  getTopicEventTypes(topic: string): string[] {
    return Array.from(this.topicEventMap.get(topic) || [])
  }

  /**
   * Get event handler for a specific event type
   */
  getEventHandler(eventType: string): EventHandler | undefined {
    return this.consumers.get(eventType)?.handler
  }

  /**
   * Get all consumer handlers as a map
   */
  getConsumerHandlers(): Record<string, EventHandler> {
    const handlers: Record<string, EventHandler> = {}
    
    for (const [eventType, consumer] of this.consumers) {
      handlers[eventType] = consumer.handler
    }
    
    return handlers
  }

  /**
   * Clear all registered producers and consumers
   */
  clear(): void {
    this.producers.clear()
    this.consumers.clear()
    this.topicEventMap.clear()
  }
}

// Global event registry instance
export const eventRegistry = new EventRegistry()