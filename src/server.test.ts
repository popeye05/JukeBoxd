import request from 'supertest';
import { app } from './server';

describe('Server Health Check', () => {
  it('should respond to health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'OK',
      environment: 'test'
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toMatchObject({
      error: {
        code: 404,
        message: 'Route /unknown-route not found'
      }
    });
  });
});