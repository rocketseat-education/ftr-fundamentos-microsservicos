export interface SagaStep {
  service: string
  action: string
  compensationAction: string
  data: any
}

export interface SagaInstance {
  id: string
  type: string
  businessId: string
  steps: SagaStep[]
  currentStep: number
  status: 'pending' | 'completed' | 'failed' | 'compensating'
  completedSteps: number[]
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface SagaCommand {
  sagaId: string
  stepNumber: number
  service: string
  action: string
  data: any
  isCompensation?: boolean
}

export interface SagaResult {
  sagaId: string
  stepNumber: number
  success: boolean
  error?: string
  data?: any
}

export interface SagaDefinition {
  type: string
  steps: SagaStep[]
}

// SagaOrchestrator interface removed - orchestration is handled by the dedicated orchestrator app

export interface SagaConsumer {
  initialize(): Promise<void>
  handleCommand(command: SagaCommand): Promise<void>
  shutdown(): Promise<void>
}