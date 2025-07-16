// Shared SAGA types and interfaces for distributed transaction management

export type SagaStatus = 'pending' | 'completed' | 'failed' | 'compensating' | 'compensated'
export type StepStatus = 'pending' | 'started' | 'completed' | 'failed' | 'compensated'

export interface SagaDefinition {
  type: string
  steps: SagaStepDefinition[]
  timeout?: number // in milliseconds
}

export interface SagaStepDefinition {
  stepNumber: number
  stepType: string
  targetService: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'KAFKA'
  timeout?: number
  compensation?: {
    endpoint: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'KAFKA'
  }
}

export interface SagaInstance {
  id: string
  sagaType: string
  sagaId: string
  status: SagaStatus
  currentStep: number
  totalSteps: number
  startedAt: Date
  completedAt?: Date
  errorMessage?: string
  metadata?: Record<string, any>
  createdBy?: string
  timeoutAt?: Date
}

export interface SagaStep {
  id: string
  sagaId: string
  stepNumber: number
  stepType: string
  targetService: string
  status: StepStatus
  requestPayload?: Record<string, any>
  responsePayload?: Record<string, any>
  compensationPayload?: Record<string, any>
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
}

export interface SagaExecutionContext {
  saga: SagaInstance
  currentStepDefinition: SagaStepDefinition
  steps: SagaStep[]
}

export interface SagaExecutionResult {
  success: boolean
  sagaId: string
  errorMessage?: string
  compensationRequired?: boolean
}

export interface SagaCompensationContext {
  saga: SagaInstance
  failedStep: number
  stepsToCompensate: SagaStep[]
}

// Event types for SAGA orchestration
export interface SagaStartedEvent {
  sagaId: string
  sagaType: string
  businessId: string
  metadata?: Record<string, any>
}

export interface SagaStepStartedEvent {
  sagaId: string
  stepNumber: number
  stepType: string
  targetService: string
}

export interface SagaStepCompletedEvent {
  sagaId: string
  stepNumber: number
  stepType: string
  success: boolean
  response?: Record<string, any>
  errorMessage?: string
}

export interface SagaCompletedEvent {
  sagaId: string
  sagaType: string
  businessId: string
  success: boolean
  completedAt: Date
}

export interface SagaFailedEvent {
  sagaId: string
  sagaType: string
  businessId: string
  failedStep: number
  errorMessage: string
  compensationRequired: boolean
}

export interface SagaCompensationStartedEvent {
  sagaId: string
  sagaType: string
  businessId: string
  startingFromStep: number
}

export interface SagaCompensationCompletedEvent {
  sagaId: string
  sagaType: string
  businessId: string
  success: boolean
  compensatedSteps: number[]
}

// SAGA orchestrator interface
export interface SagaOrchestrator {
  startSaga(definition: SagaDefinition, businessId: string, metadata?: Record<string, any>): Promise<string>
  executeNextStep(sagaId: string): Promise<SagaExecutionResult>
  compensateSaga(sagaId: string, fromStep?: number): Promise<boolean>
  getSagaStatus(sagaId: string): Promise<SagaInstance | null>
  getSagaSteps(sagaId: string): Promise<SagaStep[]>
  timeout(sagaId: string): Promise<void>
}

// Service integration interface
export interface SagaServiceClient {
  executeStep(endpoint: string, method: string, payload: Record<string, any>): Promise<Record<string, any>>
  compensateStep(endpoint: string, method: string, payload: Record<string, any>): Promise<Record<string, any>>
}