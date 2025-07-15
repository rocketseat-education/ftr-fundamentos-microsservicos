import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

export interface TracingConfig {
  serviceName: string
  serviceVersion: string
  otlpEndpoint: string
}

export function createTracingSDK(config: TracingConfig): NodeSDK {
  // Create OTLP HTTP exporter
  const otlpExporter = new OTLPTraceExporter({
    url: config.otlpEndpoint,
  })

  // Create OpenTelemetry SDK
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
    }),
    traceExporter: otlpExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for cleaner traces
        },
      }),
    ],
  })

  return sdk
}

export function initializeTracing(config: TracingConfig): NodeSDK {
  const sdk = createTracingSDK(config)
  sdk.start()
  return sdk
}