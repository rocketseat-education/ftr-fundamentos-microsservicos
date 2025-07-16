import { z } from 'zod'

// Base SAGA event schemas
export const SagaStartedEventPayload = z.object({
  sagaId: z.string().describe('Unique SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA (user-deletion, order-processing, etc.)'),
  businessId: z.string().describe('Business entity identifier (userId, orderId, etc.)'),
  metadata: z.record(z.any()).optional().describe('Additional context data'),
  startedAt: z.string().datetime().describe('When the SAGA was started'),
})

export const SagaStepStartedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  stepNumber: z.number().describe('Current step number'),
  stepType: z.string().describe('Type of step being executed'),
  targetService: z.string().describe('Service that will execute this step'),
  requestPayload: z.record(z.any()).optional().describe('Data sent to the service'),
  startedAt: z.string().datetime().describe('When the step was started'),
})

export const SagaStepCompletedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  stepNumber: z.number().describe('Completed step number'),
  stepType: z.string().describe('Type of step that was executed'),
  success: z.boolean().describe('Whether the step completed successfully'),
  responsePayload: z.record(z.any()).optional().describe('Response from the service'),
  errorMessage: z.string().optional().describe('Error message if step failed'),
  completedAt: z.string().datetime().describe('When the step was completed'),
})

export const SagaCompletedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA that completed'),
  businessId: z.string().describe('Business entity identifier'),
  success: z.boolean().describe('Whether the entire SAGA completed successfully'),
  completedAt: z.string().datetime().describe('When the SAGA was completed'),
  totalSteps: z.number().describe('Total number of steps executed'),
  duration: z.number().describe('Total duration in milliseconds'),
})

export const SagaFailedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA that failed'),
  businessId: z.string().describe('Business entity identifier'),
  failedStep: z.number().describe('Step number where the failure occurred'),
  errorMessage: z.string().describe('Detailed error message'),
  compensationRequired: z.boolean().describe('Whether compensation is needed'),
  failedAt: z.string().datetime().describe('When the SAGA failed'),
})

export const SagaCompensationStartedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA being compensated'),
  businessId: z.string().describe('Business entity identifier'),
  startingFromStep: z.number().describe('Step number to start compensation from'),
  stepsToCompensate: z.array(z.number()).describe('List of step numbers to compensate'),
  startedAt: z.string().datetime().describe('When compensation was started'),
})

export const SagaCompensationCompletedEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA that was compensated'),
  businessId: z.string().describe('Business entity identifier'),
  success: z.boolean().describe('Whether compensation completed successfully'),
  compensatedSteps: z.array(z.number()).describe('Steps that were successfully compensated'),
  failedCompensations: z.array(z.number()).optional().describe('Steps that failed to compensate'),
  completedAt: z.string().datetime().describe('When compensation was completed'),
})

export const SagaTimeoutEventPayload = z.object({
  sagaId: z.string().describe('SAGA instance identifier'),
  sagaType: z.string().describe('Type of SAGA that timed out'),
  businessId: z.string().describe('Business entity identifier'),
  currentStep: z.number().describe('Step that was executing when timeout occurred'),
  timeoutAt: z.string().datetime().describe('When the timeout occurred'),
  elapsedTime: z.number().describe('Total elapsed time in milliseconds'),
})

// Event wrappers with type information
export const SagaStartedEvent = z.object({
  type: z.literal('saga.started'),
  payload: SagaStartedEventPayload,
})

export const SagaStepStartedEvent = z.object({
  type: z.literal('saga.step.started'),
  payload: SagaStepStartedEventPayload,
})

export const SagaStepCompletedEvent = z.object({
  type: z.literal('saga.step.completed'),
  payload: SagaStepCompletedEventPayload,
})

export const SagaCompletedEvent = z.object({
  type: z.literal('saga.completed'),
  payload: SagaCompletedEventPayload,
})

export const SagaFailedEvent = z.object({
  type: z.literal('saga.failed'),
  payload: SagaFailedEventPayload,
})

export const SagaCompensationStartedEvent = z.object({
  type: z.literal('saga.compensation.started'),
  payload: SagaCompensationStartedEventPayload,
})

export const SagaCompensationCompletedEvent = z.object({
  type: z.literal('saga.compensation.completed'),
  payload: SagaCompensationCompletedEventPayload,
})

export const SagaTimeoutEvent = z.object({
  type: z.literal('saga.timeout'),
  payload: SagaTimeoutEventPayload,
})

// Type exports
export type SagaStartedEventPayload = z.infer<typeof SagaStartedEventPayload>
export type SagaStepStartedEventPayload = z.infer<typeof SagaStepStartedEventPayload>
export type SagaStepCompletedEventPayload = z.infer<typeof SagaStepCompletedEventPayload>
export type SagaCompletedEventPayload = z.infer<typeof SagaCompletedEventPayload>
export type SagaFailedEventPayload = z.infer<typeof SagaFailedEventPayload>
export type SagaCompensationStartedEventPayload = z.infer<typeof SagaCompensationStartedEventPayload>
export type SagaCompensationCompletedEventPayload = z.infer<typeof SagaCompensationCompletedEventPayload>
export type SagaTimeoutEventPayload = z.infer<typeof SagaTimeoutEventPayload>

export type SagaStartedEvent = z.infer<typeof SagaStartedEvent>
export type SagaStepStartedEvent = z.infer<typeof SagaStepStartedEvent>
export type SagaStepCompletedEvent = z.infer<typeof SagaStepCompletedEvent>
export type SagaCompletedEvent = z.infer<typeof SagaCompletedEvent>
export type SagaFailedEvent = z.infer<typeof SagaFailedEvent>
export type SagaCompensationStartedEvent = z.infer<typeof SagaCompensationStartedEvent>
export type SagaCompensationCompletedEvent = z.infer<typeof SagaCompensationCompletedEvent>
export type SagaTimeoutEvent = z.infer<typeof SagaTimeoutEvent>