import { initializeTracing } from '@microservices/shared/core/tracing.ts'
import type { NodeSDK } from '@opentelemetry/sdk-node'
import { env } from './env.ts'

const sdk: NodeSDK = initializeTracing({
  serviceName: env.OTEL_SERVICE_NAME,
  serviceVersion: env.OTEL_SERVICE_VERSION,
  otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
})

export default sdk
