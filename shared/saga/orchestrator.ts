// This file now contains only HTTP client for communicating with the orchestrator service
// The actual orchestration logic is in the dedicated orchestrator app

export interface OrchestratorHttpClient {
  startSaga(sagaType: string, businessId: string, metadata?: Record<string, any>): Promise<{ success: boolean; sagaId?: string; errorMessage?: string }>
  getSagaStatus(sagaId: string): Promise<any>
  getAllSagas(): Promise<any[]>
}

export class HttpOrchestratorClient implements OrchestratorHttpClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async startSaga(sagaType: string, businessId: string, metadata?: Record<string, any>): Promise<{ success: boolean; sagaId?: string; errorMessage?: string }> {
    const response = await fetch(`${this.baseUrl}/saga/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sagaType,
        businessId,
        metadata,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async getSagaStatus(sagaId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/saga/${sagaId}/status`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  async getAllSagas(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/saga`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }
}