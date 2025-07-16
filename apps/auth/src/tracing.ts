// This file initializes OpenTelemetry tracing for the auth service
// It must be imported before any other imports to ensure proper instrumentation

// Set OpenTelemetry environment variables if not already set
if (!process.env.OTEL_SERVICE_NAME) {
  process.env.OTEL_SERVICE_NAME = 'auth'
}

if (!process.env.OTEL_SERVICE_VERSION) {
  process.env.OTEL_SERVICE_VERSION = '1.0.0'
}

if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318'
}

// Set the traces endpoint specifically
if (!process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://localhost:4318/v1/traces'
}

// Enable specific instrumentations
if (!process.env.OTEL_NODE_DISABLED_INSTRUMENTATIONS) {
  process.env.OTEL_NODE_DISABLED_INSTRUMENTATIONS = 'fs'
}

// Configure the exporter
if (!process.env.OTEL_TRACES_EXPORTER) {
  process.env.OTEL_TRACES_EXPORTER = 'otlp'
}

// Import the auto-instrumentation register
import '@opentelemetry/auto-instrumentations-node/register'

// Log initialization info only in development
if (process.env.NODE_ENV === 'development') {
  console.log(`OpenTelemetry auto-instrumentation initialized for service: ${process.env.OTEL_SERVICE_NAME}`)
  console.log(`Exporting traces to: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`)
}  