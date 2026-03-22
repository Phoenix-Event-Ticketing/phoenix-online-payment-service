jest.mock('../../config/env', () => ({
  nodeEnv: 'test',
  corsOrigin: 'https://app.example.com,https://admin.example.com',
}));

const request = require('supertest');
const createApp = require('../../app');

describe('app', () => {
  it('creates express app with CORS for comma-separated origins', async () => {
    const app = createApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://app.example.com');

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://app.example.com',
    );
  });

  it('applies security headers via helmet', async () => {
    const app = createApp();

    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();

    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('registers health routes', async () => {
    const app = createApp();

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('serves Swagger UI at /api-docs', async () => {
    const app = createApp();

    const res = await request(app).get('/api-docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('serves OpenAPI JSON at /api-docs/swagger.json', async () => {
    const app = createApp();

    const res = await request(app).get('/api-docs/swagger.json');

    expect(res.status).toBe(200);
    expect(res.body.info.title).toBe('Phoenix Payment Service API');
    expect(res.body.openapi).toBe('3.0.0');
  });
});
