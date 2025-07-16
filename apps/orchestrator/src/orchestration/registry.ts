import type { OrchestrationEventHandler, OrchestrationEventRegistry } from '@url-shortener/shared/orchestration/types.ts'

export class OrchestrationRegistry implements OrchestrationEventRegistry {
  private handlers = new Map<string, OrchestrationEventHandler>()

  register(handler: OrchestrationEventHandler): void {
    this.handlers.set(handler.eventType, handler)
    console.log(`Orchestrator Service: Registered handler for event type: ${handler.eventType}`)
  }

  getHandler(eventType: string): OrchestrationEventHandler | undefined {
    return this.handlers.get(eventType)
  }

  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  async loadHandlers(): Promise<void> {
    // Dynamically import all event handlers
    const { userDeletionHandler } = await import('./events/user-deletion.ts')
    
    // Register all handlers
    this.register(userDeletionHandler)
    
    // Log registered handlers
    console.log(`Orchestrator Service: Loaded ${this.handlers.size} orchestration handlers`)
    console.log(`Orchestrator Service: Registered event types: ${this.getRegisteredEventTypes().join(', ')}`)
  }
}