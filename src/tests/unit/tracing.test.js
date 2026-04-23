const mockStart = jest.fn();
const mockShutdown = jest.fn();
const mockNodeSdkCtor = jest.fn(() => ({
  start: mockStart,
  shutdown: mockShutdown,
}));
const mockAutoInstrumentations = jest.fn(() => ['auto-instrumentations']);
const mockJaegerCtor = jest.fn((opts) => ({ ...opts, exporter: 'jaeger' }));

jest.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: mockNodeSdkCtor,
}));

jest.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: mockAutoInstrumentations,
}));

jest.mock('@opentelemetry/exporter-jaeger', () => ({
  JaegerExporter: mockJaegerCtor,
}));

const { initTracing, shutdownTracing } = require('../../observability/tracing');

describe('observability/tracing', () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockShutdown.mockReset();
    mockNodeSdkCtor.mockClear();
    mockAutoInstrumentations.mockClear();
    mockJaegerCtor.mockClear();
  });

  it('does nothing when jaeger endpoint is missing', async () => {
    await initTracing({ serviceName: 'svc', jaegerEndpoint: '' });

    expect(mockNodeSdkCtor).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('initializes NodeSDK and starts tracing when endpoint is provided', async () => {
    await initTracing({ serviceName: 'payment', jaegerEndpoint: 'http://jaeger:14268/api/traces' });

    expect(mockJaegerCtor).toHaveBeenCalledWith({ endpoint: 'http://jaeger:14268/api/traces' });
    expect(mockAutoInstrumentations).toHaveBeenCalledTimes(1);
    expect(mockNodeSdkCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'payment',
        instrumentations: [['auto-instrumentations']],
      }),
    );
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('shuts down sdk when initialized', async () => {
    await initTracing({ serviceName: 'payment', jaegerEndpoint: 'http://jaeger:14268/api/traces' });
    await shutdownTracing();

    expect(mockShutdown).toHaveBeenCalledTimes(1);
  });

  it('allows repeated shutdown calls safely', async () => {
    await initTracing({ serviceName: 'payment', jaegerEndpoint: 'http://jaeger:14268/api/traces' });
    await shutdownTracing();
    await shutdownTracing();

    expect(mockShutdown).toHaveBeenCalledTimes(1);
  });
});
