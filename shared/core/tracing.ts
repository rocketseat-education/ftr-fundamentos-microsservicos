import { trace, context, SpanStatusCode } from '@opentelemetry/api'

/**
 * Get a tracer for the current service
 */
export function getTracer(name: string) {
  return trace.getTracer(name)
}

/**
 * Wrap an async function with OpenTelemetry tracing
 */
export async function withSpan<T>(
  tracer: ReturnType<typeof getTracer>,
  spanName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      // Add attributes if provided
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value)
        }
      }

      // Execute the function
      const result = await fn()
      
      // Set span status to OK
      span.setStatus({ code: SpanStatusCode.OK })
      
      return result
    } catch (error) {
      // Record the error
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      if (error instanceof Error) {
        span.recordException(error)
      }
      
      throw error
    } finally {
      // End the span
      span.end()
    }
  })
}

/**
 * Add event to current span
 */
export function addEvent(name: string, attributes?: Record<string, any>) {
  const span = trace.getActiveSpan()
  if (span) {
    span.addEvent(name, attributes)
  }
}

/**
 * Set attributes on current span
 */
export function setAttributes(attributes: Record<string, any>) {
  const span = trace.getActiveSpan()
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value)
    }
  }
}

/**
 * Create a new context with baggage
 */
export function createContext() {
  return context.active()
}