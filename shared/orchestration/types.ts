import { z } from 'zod'

// Orchestration request from services to orchestrator
export const OrchestrationRequestSchema = z.object({
  requestId: z.string().describe('Unique request identifier for response correlation'),
  eventType: z.string().describe('Type of event to orchestrate'),
  businessId: z.string().describe('Business entity identifier (userId, orderId, etc.)'),
  metadata: z.record(z.any()).optional().describe('Additional context data'),
  requestedBy: z.string().describe('Service that initiated the orchestration'),
  timestamp: z.string().datetime().describe('Request timestamp'),
})

export type OrchestrationRequest = z.infer<typeof OrchestrationRequestSchema>

// Orchestration response from orchestrator to services
export const OrchestrationResponseSchema = z.object({
  requestId: z.string().describe('Correlation ID from original request'),
  success: z.boolean().describe('Whether orchestration was initiated successfully'),
  sagaId: z.string().optional().describe('Generated saga ID for tracking'),
  errorMessage: z.string().optional().describe('Error message if unsuccessful'),
  timestamp: z.string().datetime().describe('Response timestamp'),
})

export type OrchestrationResponse = z.infer<typeof OrchestrationResponseSchema>

// Orchestration event handler interface
export interface OrchestrationEventHandler {
  eventType: string
  handle(request: OrchestrationRequest): Promise<{ success: boolean; sagaId?: string; errorMessage?: string }>
}

// Registry for orchestration event handlers
export interface OrchestrationEventRegistry {
  register(handler: OrchestrationEventHandler): void
  getHandler(eventType: string): OrchestrationEventHandler | undefined
  getRegisteredEventTypes(): string[]
}