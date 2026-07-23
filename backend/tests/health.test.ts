import app from '../src/app';
import http from 'http';

describe('GET /api/health', () => {
  let server: http.Server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should return service info', async () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No address');

    const res = await fetch(`http://localhost:${address.port}/api/health`);
    const body = (await res.json()) as { service: string; status: string; timestamp: string };

    expect(body).toHaveProperty('service', 'SIT API');
    expect(body).toHaveProperty('timestamp');
    expect(['ok', 'error']).toContain(body.status);
  });
});
