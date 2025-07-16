import { 
  SharedKafkaProducer, 
  SharedKafkaConsumer, 
  createKafkaInstance, 
  TOPICS
} from '@url-shortener/shared/kafka/index.ts'
import { KafkaOrchestrator, ORCHESTRATION_EVENTS } from '@url-shortener/shared/orchestration/index.ts'
import { env } from '../env.ts'

// Create Kafka instance for auth service orchestration
const kafka = createKafkaInstance({
  clientId: 'auth-orchestration-service',
  brokers: env.KAFKA_BROKERS.split(','),
})

// Create shared producer and consumer for orchestration
const producer = new SharedKafkaProducer({
  kafka,
  serviceName: 'Auth Service',
})

const consumer = new SharedKafkaConsumer({
  kafka,
  serviceName: 'Auth Service',
  groupId: 'auth-orchestration-group',
})

// Create Kafka orchestrator
const kafkaOrchestrator = new KafkaOrchestrator({
  producer,
  consumer,
  requestTopic: TOPICS.ORCHESTRATION_REQUESTS,
  responseTopic: TOPICS.ORCHESTRATION_RESPONSES,
})

export class AuthOrchestrationService {
  async initialize(): Promise<void> {
    await producer.connect()
    await kafkaOrchestrator.initialize()
    console.log('Auth Service: Kafka orchestration service initialized')
  }

  async requestUserDeletion(userId: string): Promise<string> {
    const response = await kafkaOrchestrator.requestOrchestration(
      ORCHESTRATION_EVENTS.USER_DELETION,
      userId,
      { requestedBy: 'auth-service' }
    )
    
    if (!response.success) {
      throw new Error(response.errorMessage || 'Failed to start user deletion saga')
    }
    
    return response.sagaId!
  }

  async shutdown(): Promise<void> {
    await kafkaOrchestrator.shutdown()
    await producer.disconnect()
    console.log('Auth Service: Kafka orchestration service shutdown')
  }
}

// Export singleton instance
export const authOrchestrationService = new AuthOrchestrationService()