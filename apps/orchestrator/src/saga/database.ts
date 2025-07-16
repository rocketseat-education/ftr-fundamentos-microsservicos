import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import type { SagaDatabase } from './orchestrator.ts'
import type { SagaInstance, SagaStep } from './types.ts'

/**
 * Generic SAGA database implementation that can be used by any service
 * Each service will pass its own database connection and table definitions
 */
export class DrizzleSagaDatabase implements SagaDatabase {
  private db: NodePgDatabase<any>
  private sagasTable: any
  private sagaStepsTable: any

  constructor(
    db: NodePgDatabase<any>,
    sagasTable: any,
    sagaStepsTable: any
  ) {
    this.db = db
    this.sagasTable = sagasTable
    this.sagaStepsTable = sagaStepsTable
  }

  async createSaga(saga: {
    id: string
    sagaType: string
    sagaId: string
    status: string
    totalSteps: number
    metadata?: Record<string, any>
    timeoutAt?: Date
  }): Promise<void> {
    await this.db.insert(this.sagasTable).values({
      id: saga.id,
      sagaType: saga.sagaType,
      sagaId: saga.sagaId,
      status: saga.status,
      currentStep: 0,
      totalSteps: saga.totalSteps,
      startedAt: new Date(),
      metadata: saga.metadata,
      timeoutAt: saga.timeoutAt,
    })
  }

  async createSagaStep(step: {
    id: string
    sagaId: string
    stepNumber: number
    stepType: string
    targetService: string
    status: string
  }): Promise<void> {
    await this.db.insert(this.sagaStepsTable).values({
      id: step.id,
      sagaId: step.sagaId,
      stepNumber: step.stepNumber,
      stepType: step.stepType,
      targetService: step.targetService,
      status: step.status,
    })
  }

  async updateSaga(id: string, updates: Partial<SagaInstance>): Promise<void> {
    await this.db
      .update(this.sagasTable)
      .set(updates)
      .where(eq(this.sagasTable.id, id))
  }

  async updateSagaStep(id: string, updates: Partial<SagaStep>): Promise<void> {
    await this.db
      .update(this.sagaStepsTable)
      .set(updates)
      .where(eq(this.sagaStepsTable.id, id))
  }

  async getSaga(id: string): Promise<SagaInstance | null> {
    const result = await this.db
      .select()
      .from(this.sagasTable)
      .where(eq(this.sagasTable.id, id))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const saga = result[0]
    return {
      id: saga.id,
      sagaType: saga.sagaType,
      sagaId: saga.sagaId,
      status: saga.status,
      currentStep: saga.currentStep || 0,
      totalSteps: saga.totalSteps,
      startedAt: saga.startedAt,
      completedAt: saga.completedAt || undefined,
      errorMessage: saga.errorMessage || undefined,
      metadata: saga.metadata || undefined,
      createdBy: saga.createdBy || undefined,
      timeoutAt: saga.timeoutAt || undefined,
    }
  }

  async getSagaSteps(sagaId: string): Promise<SagaStep[]> {
    const result = await this.db
      .select()
      .from(this.sagaStepsTable)
      .where(eq(this.sagaStepsTable.sagaId, sagaId))
      .orderBy(this.sagaStepsTable.stepNumber)

    return result.map((step: any) => ({
      id: step.id,
      sagaId: step.sagaId,
      stepNumber: step.stepNumber,
      stepType: step.stepType,
      targetService: step.targetService,
      status: step.status,
      requestPayload: step.requestPayload || undefined,
      responsePayload: step.responsePayload || undefined,
      compensationPayload: step.compensationPayload || undefined,
      startedAt: step.startedAt || undefined,
      completedAt: step.completedAt || undefined,
      errorMessage: step.errorMessage || undefined,
    }))
  }
}