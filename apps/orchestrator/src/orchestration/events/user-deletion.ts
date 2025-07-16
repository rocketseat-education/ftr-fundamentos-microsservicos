import type { OrchestrationRequest, OrchestrationEventHandler } from '@url-shortener/shared/orchestration/types.ts'
import { ORCHESTRATION_EVENTS } from '@url-shortener/shared/orchestration/index.ts'
import { SAGA_TYPES } from '@url-shortener/shared/saga/index.ts'
import { SimpleSagaOrchestrator } from '../../saga/index.ts'

export class UserDeletionOrchestrationHandler implements OrchestrationEventHandler {
  eventType = ORCHESTRATION_EVENTS.USER_DELETION
  private sagaOrchestrator: SimpleSagaOrchestrator
  
  constructor(sagaOrchestrator: SimpleSagaOrchestrator) {
    this.sagaOrchestrator = sagaOrchestrator
  }

  async handle(request: OrchestrationRequest): Promise<{ success: boolean; sagaId?: string; errorMessage?: string }> {
    try {
      const sagaDefinition = {
        type: SAGA_TYPES.USER_DELETION,
        timeout: 5 * 60 * 1000, // 5 minutes
        steps: [
          {
            stepNumber: 1,
            stepType: 'delete-user-urls',
            targetService: 'url-shortener',
            endpoint: 'url-shortener:delete-user-urls',
            method: 'KAFKA' as const,
            compensation: {
              endpoint: 'url-shortener:restore-user-urls',
              method: 'KAFKA' as const,
            },
          },
          {
            stepNumber: 2,
            stepType: 'delete-user-analytics',
            targetService: 'analytics',
            endpoint: 'analytics:delete-user-analytics',
            method: 'KAFKA' as const,
            compensation: {
              endpoint: 'analytics:restore-user-analytics',
              method: 'KAFKA' as const,
            },
          },
          {
            stepNumber: 3,
            stepType: 'delete-user-account',
            targetService: 'auth',
            endpoint: 'auth:delete-user-account',
            method: 'KAFKA' as const,
            compensation: {
              endpoint: 'auth:restore-user-account',
              method: 'KAFKA' as const,
            },
          },
        ],
      }

      console.log(`Orchestrator Service: Processing user deletion orchestration for user ${request.businessId}`)
      
      const result = await this.sagaOrchestrator.executeSaga(sagaDefinition, request.businessId, request.metadata)
      
      if (result.success) {
        console.log(`Orchestrator Service: User deletion saga started successfully with ID: ${result.sagaId}`)
        return { success: true, sagaId: result.sagaId }
      } else {
        console.error(`Orchestrator Service: Failed to start user deletion saga: ${result.errorMessage}`)
        return { success: false, errorMessage: result.errorMessage }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Orchestrator Service: Error in user deletion orchestration: ${errorMessage}`)
      return { success: false, errorMessage }
    }
  }
}

// Create and export the handler instance (will be injected with dependencies)
export let userDeletionHandler: UserDeletionOrchestrationHandler

export function createUserDeletionHandler(sagaOrchestrator: SimpleSagaOrchestrator): void {
  userDeletionHandler = new UserDeletionOrchestrationHandler(sagaOrchestrator)
}