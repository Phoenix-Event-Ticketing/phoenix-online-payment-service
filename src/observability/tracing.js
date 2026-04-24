const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

let sdk;

async function initTracing({ serviceName, jaegerEndpoint }) {
  if (!jaegerEndpoint) return;
  sdk = new NodeSDK({
    serviceName,
    traceExporter: new JaegerExporter({ endpoint: jaegerEndpoint }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  await sdk.start();
}

async function shutdownTracing() {
  if (sdk) {
    await sdk.shutdown();
    sdk = undefined;
  }
}

module.exports = {
  initTracing,
  shutdownTracing,
};
