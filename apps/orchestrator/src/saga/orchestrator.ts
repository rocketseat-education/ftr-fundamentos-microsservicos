import { createId } from '@paralleldrive/cuid2'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import type {
  SagaDefinition,
  SagaInstance,
  SagaStep,
  SagaExecutionResult,
  SagaServiceClient,
} from './types.ts'

export interface SagaDatabase {
  createSaga(saga: {
    id: string
    sagaType: string
    sagaId: string
    status: string
    totalSteps: number
    metadata?: Record<string, any>
    timeoutAt?: Date
  }): Promise<void>
  
  createSagaStep(step: {
    id: string
    sagaId: string
    stepNumber: number
    stepType: string
    targetService: string
    status: string
  }): Promise<void>
  
  updateSaga(id: string, updates: Partial<SagaInstance>): Promise<void>
  updateSagaStep(id: string, updates: Partial<SagaStep>): Promise<void>
  
  getSaga(id: string): Promise<SagaInstance | null>
  getSagaSteps(sagaId: string): Promise<SagaStep[]>
}

export interface SagaEventPublisher {
  publishSagaStarted(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    startedAt: string
    metadata?: Record<string, any>
  }): Promise<void>
  
  publishSagaCompleted(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    success: boolean
    completedAt: string
    totalSteps: number
    duration: number
  }): Promise<void>
  
  publishSagaFailed(payload: {
    sagaId: string
    sagaType: string
    businessId: string
    serviceName: string
    failedStep: number
    errorMessage: string
    compensationRequired: boolean
    failedAt: string
  }): Promise<void>
  
  publishStepCompleted(payload: {
    sagaId: string
    stepNumber: number
    stepType: string
    targetService: string
    success: boolean
    responsePayload?: Record<string, any>
    errorMessage?: string
    completedAt: string
  }): Promise<void>
}

/**
 * Simplified SAGA Orchestrator for educational purposes
 * Focuses on core concepts: execution, compensation, and events
 */
export class SimpleSagaOrchestrator {
  private serviceName: string
  private database: SagaDatabase
  private eventPublisher: SagaEventPublisher
  private serviceClient: SagaServiceClient

  constructor(
    serviceName: string,
    database: SagaDatabase,
    eventPublisher: SagaEventPublisher,
    serviceClient: SagaServiceClient
  ) {
    this.serviceName = serviceName
    this.database = database
    this.eventPublisher = eventPublisher
    this.serviceClient = serviceClient
  }

  /**
   * Execute a SAGA with automatic compensation on failure
   */
  async executeSaga(
    definition: SagaDefinition,
    businessId: string,
    metadata?: Record<string, any>
  ): Promise<SagaExecutionResult> {
    const sagaId = createId()
    const startedAt = new Date()
    
    try {
      // 1. Create SAGA instance
      await this.database.createSaga({
        id: sagaId,
        sagaType: definition.type,
        sagaId: businessId,
        status: 'pending',
        totalSteps: definition.steps.length,
        metadata,
        timeoutAt: definition.timeout ? new Date(Date.now() + definition.timeout) : undefined,
      })

      // 2. Create step records
      for (const stepDef of definition.steps) {
        await this.database.createSagaStep({
          id: createId(),
          sagaId,
          stepNumber: stepDef.stepNumber,
          stepType: stepDef.stepType,
          targetService: stepDef.targetService,
          status: 'pending',
        })
      }

      // 3. Publish start event
      await this.eventPublisher.publishSagaStarted({
        sagaId,
        sagaType: definition.type,
        businessId,
        serviceName: this.serviceName,
        startedAt: startedAt.toISOString(),
        metadata,
      })

      // 4. Execute steps sequentially
      for (const step of definition.steps) {
        const stepResult = await this.executeStep(sagaId, step, metadata || {})
        
        if (!stepResult.success) {
          // Step failed - start compensation
          await this.compensate(sagaId, definition, step.stepNumber, metadata || {})
          
          await this.eventPublisher.publishSagaFailed({
            sagaId,
            sagaType: definition.type,
            businessId,
            serviceName: this.serviceName,
            failedStep: step.stepNumber,
            errorMessage: stepResult.errorMessage || 'Step execution failed',
            compensationRequired: true,
            failedAt: new Date().toISOString(),
          })
          
          return {
            success: false,
            sagaId,
            errorMessage: stepResult.errorMessage,
            compensationRequired: true,
          }
        }
      }

      // 5. All steps completed successfully
      await this.database.updateSaga(sagaId, {
        status: 'completed',
        completedAt: new Date(),
      })

      await this.eventPublisher.publishSagaCompleted({
        sagaId,
        sagaType: definition.type,
        businessId,
        serviceName: this.serviceName,
        success: true,
        completedAt: new Date().toISOString(),
        totalSteps: definition.steps.length,
        duration: Date.now() - startedAt.getTime(),
      })

      return {
        success: true,
        sagaId,
      }

    } catch (error) {
      console.error('SAGA execution failed:', error)
      
      await this.database.updateSaga(sagaId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        success: false,
        sagaId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        compensationRequired: false,
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    sagaId: string,
    stepDef: any,
    metadata: Record<string, any>
  ): Promise<{ success: boolean; errorMessage?: string; responsePayload?: Record<string, any> }> {
    const startedAt = new Date()
    
    try {
      // Update step status to started
      const steps = await this.database.getSagaSteps(sagaId)
      const step = steps.find(s => s.stepNumber === stepDef.stepNumber)
      
      if (step) {
        await this.database.updateSagaStep(step.id, {
          status: 'started',
          startedAt,
        })
      }

      // Get saga instance for businessId
      const saga = await this.database.getSaga(sagaId)
      const businessId = saga?.sagaId || ''
      
      // Execute the step
      const response = await this.serviceClient.executeStep(
        stepDef.endpoint,
        stepDef.method,
        { 
          ...metadata, 
          sagaId,
          stepNumber: stepDef.stepNumber,
          businessId
        }
      )

      // Update step status to completed
      if (step) {
        await this.database.updateSagaStep(step.id, {
          status: 'completed',
          completedAt: new Date(),
          responsePayload: response,
        })
      }

      // Publish step completion event
      await this.eventPublisher.publishStepCompleted({
        sagaId,
        stepNumber: stepDef.stepNumber,
        stepType: stepDef.stepType,
        targetService: stepDef.targetService,
        success: true,
        responsePayload: response,
        completedAt: new Date().toISOString(),
      })

      return {
        success: true,
        responsePayload: response,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update step status to failed
      const steps = await this.database.getSagaSteps(sagaId)
      const step = steps.find(s => s.stepNumber === stepDef.stepNumber)
      
      if (step) {
        await this.database.updateSagaStep(step.id, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
        })
      }

      // Publish step failure event
      await this.eventPublisher.publishStepCompleted({
        sagaId,
        stepNumber: stepDef.stepNumber,
        stepType: stepDef.stepType,
        targetService: stepDef.targetService,
        success: false,
        errorMessage,
        completedAt: new Date().toISOString(),
      })

      return {
        success: false,
        errorMessage,
      }
    }
  }

  /**
   * Compensate failed SAGA by calling compensation endpoints in reverse order
   */
  private async compensate(
    sagaId: string,
    definition: SagaDefinition,
    failedStep: number,
    metadata: Record<string, any>
  ): Promise<void> {
    console.log(`Starting compensation for SAGA ${sagaId} from step ${failedStep}`)
    
    // Get completed steps that need compensation (in reverse order)
    const stepsToCompensate = definition.steps
      .filter(step => step.stepNumber < failedStep && step.compensation)
      .reverse()

    // Update SAGA status to compensating
    await this.database.updateSaga(sagaId, {
      status: 'compensating',
    })

    // Execute compensation steps
    for (const stepDef of stepsToCompensate) {
      if (!stepDef.compensation) continue

      try {
        console.log(`Compensating step ${stepDef.stepNumber}: ${stepDef.stepType}`)
        
        // Get saga instance for businessId
        const saga = await this.database.getSaga(sagaId)
        const businessId = saga?.sagaId || ''
        
        await this.serviceClient.compensateStep(
          stepDef.compensation.endpoint,
          stepDef.compensation.method,
          { 
            ...metadata, 
            sagaId,
            stepNumber: stepDef.stepNumber,
            businessId
          }
        )

        // Update step status to compensated
        const steps = await this.database.getSagaSteps(sagaId)
        const step = steps.find(s => s.stepNumber === stepDef.stepNumber)
        
        if (step) {
          await this.database.updateSagaStep(step.id, {
            status: 'compensated',
            completedAt: new Date(),
          })
        }

      } catch (error) {
        console.error(`Compensation failed for step ${stepDef.stepNumber}:`, error)
        // Continue with other compensations even if one fails
      }
    }

    // Update SAGA status to compensated
    await this.database.updateSaga(sagaId, {
      status: 'compensated',
      completedAt: new Date(),
    })
  }

  /**
   * Get SAGA status for monitoring
   */
  async getSagaStatus(sagaId: string): Promise<{
    saga: SagaInstance | null
    steps: SagaStep[]
  }> {
    const saga = await this.database.getSaga(sagaId)
    const steps = await this.database.getSagaSteps(sagaId)
    
    return { saga, steps }
  }
}