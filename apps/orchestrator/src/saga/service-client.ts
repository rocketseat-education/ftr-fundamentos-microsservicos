import type { SagaServiceClient } from './types.ts'

/**
 * Simple HTTP client for SAGA step execution
 * Handles service-to-service communication for SAGA operations
 */
export class HttpSagaServiceClient implements SagaServiceClient {
  private baseUrls: Record<string, string>

  constructor(baseUrls: Record<string, string>) {
    this.baseUrls = baseUrls
  }

  async executeStep(
    endpoint: string,
    method: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const { serviceUrl, path } = this.parseEndpoint(endpoint)
    const url = `${serviceUrl}${path}`

    console.log(`Executing SAGA step: ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Return empty object for successful responses without body
    if (response.status === 204) {
      return {}
    }

    const result = await response.json()
    console.log(`SAGA step completed successfully:`, result)
    return result
  }

  async compensateStep(
    endpoint: string,
    method: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    const { serviceUrl, path } = this.parseEndpoint(endpoint)
    const url = `${serviceUrl}${path}`

    console.log(`Compensating SAGA step: ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`Compensation failed: HTTP ${response.status}: ${response.statusText}`)
    }

    // Return empty object for successful responses without body
    if (response.status === 204) {
      return {}
    }

    const result = await response.json()
    console.log(`SAGA step compensated successfully:`, result)
    return result
  }

  private parseEndpoint(endpoint: string): { serviceUrl: string; path: string } {
    // Parse endpoint format: "service-name:/path"
    const [serviceName, path] = endpoint.split(':')
    
    const serviceUrl = this.baseUrls[serviceName]
    if (!serviceUrl) {
      throw new Error(`Unknown service: ${serviceName}`)
    }

    return {
      serviceUrl,
      path: path || '/',
    }
  }
}