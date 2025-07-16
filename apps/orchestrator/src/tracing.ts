import './env.ts'
import { initializeTracing } from '@url-shortener/shared/core/tracing.ts'
import { env } from './env.ts'

initializeTracing({
  serviceName: env.OTEL_SERVICE_NAME,
  serviceVersion: env.OTEL_SERVICE_VERSION,
  otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
})