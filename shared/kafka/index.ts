// Shared Kafka utilities for microservices

export * from './config.ts'
export * from './producer.ts'
export * from './consumer.ts'
export * from './event-registry.ts'

// Re-export commonly used utilities
export { createKafkaInstance, TOPICS, CONSUMER_GROUPS } from './config.ts'
export { SharedKafkaProducer } from './producer.ts'
export { SharedKafkaConsumer } from './consumer.ts'
export { EventRegistry, eventRegistry } from './event-registry.ts'