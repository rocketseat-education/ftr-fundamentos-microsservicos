import { z } from 'zod'

/**
 * Command event sent by orchestrator to services for step execution
 */
export const SagaStepCommandPayload = z.object({
  correlationId: z.string().describe('Unique ID to correlate command with result'),
  sagaId: z.string().describe('SAGA instance ID'),
  stepNumber: z.number().describe('Step number in the SAGA sequence'),
  stepType: z.string().describe('Type of step to execute (e.g., delete-user-urls)'),
  targetService: z.string().describe('Service that should handle this command'),
  businessId: z.string().describe('Business entity ID (e.g., userId)'),
  metadata: z.record(z.any()).optional().describe('Additional context data'),
  timestamp: z.string().datetime().describe('Command creation timestamp'),
})

export type SagaStepCommandPayload = z.infer<typeof SagaStepCommandPayload>

/**
 * Result event sent by services back to orchestrator after step execution
 */
export const SagaStepResultPayload = z.object({
  correlationId: z.string().describe('Correlation ID from the command'),
  sagaId: z.string().describe('SAGA instance ID'),
  stepNumber: z.number().describe('Step number that was executed'),
  stepType: z.string().describe('Type of step that was executed'),
  service: z.string().describe('Service that executed the step'),
  success: z.boolean().describe('Whether the step succeeded'),
  error: z.string().optional().describe('Error message if step failed'),
  data: z.record(z.any()).optional().describe('Result data from step execution'),
  timestamp: z.string().datetime().describe('Result creation timestamp'),
})

export type SagaStepResultPayload = z.infer<typeof SagaStepResultPayload>

/**
 * Compensation command sent by orchestrator to services
 */
export const SagaCompensationCommandPayload = z.object({
  correlationId: z.string().describe('Unique ID to correlate command with result'),
  sagaId: z.string().describe('SAGA instance ID'),
  stepNumber: z.number().describe('Step number to compensate'),
  stepType: z.string().describe('Type of compensation to execute (e.g., restore-user-urls)'),
  targetService: z.string().describe('Service that should handle this compensation'),
  businessId: z.string().describe('Business entity ID (e.g., userId)'),
  originalStepData: z.record(z.any()).optional().describe('Data from original step execution'),
  metadata: z.record(z.any()).optional().describe('Additional context data'),
  timestamp: z.string().datetime().describe('Command creation timestamp'),
})

export type SagaCompensationCommandPayload = z.infer<typeof SagaCompensationCommandPayload>

/**
 * Compensation result sent by services back to orchestrator
 */
export const SagaCompensationResultPayload = z.object({
  correlationId: z.string().describe('Correlation ID from the command'),
  sagaId: z.string().describe('SAGA instance ID'),
  stepNumber: z.number().describe('Step number that was compensated'),
  stepType: z.string().describe('Type of compensation that was executed'),
  service: z.string().describe('Service that executed the compensation'),
  success: z.boolean().describe('Whether the compensation succeeded'),
  error: z.string().optional().describe('Error message if compensation failed'),
  data: z.record(z.any()).optional().describe('Result data from compensation'),
  timestamp: z.string().datetime().describe('Result creation timestamp'),
})

export type SagaCompensationResultPayload = z.infer<typeof SagaCompensationResultPayload>

/**
 * Step types for user deletion saga
 */
export const SAGA_STEP_TYPES = {
  // Forward steps
  DELETE_USER_URLS: 'delete-user-urls',
  DELETE_USER_ANALYTICS: 'delete-user-analytics',
  DELETE_USER_ACCOUNT: 'delete-user-account',
  
  // Compensation steps
  RESTORE_USER_URLS: 'restore-user-urls',
  RESTORE_USER_ANALYTICS: 'restore-user-analytics',
  RESTORE_USER_ACCOUNT: 'restore-user-account',
} as const

/**
 * Target services for saga steps
 */
export const SAGA_TARGET_SERVICES = {
  AUTH: 'auth',
  URL_SHORTENER: 'url-shortener',
  ANALYTICS: 'analytics',
} as const