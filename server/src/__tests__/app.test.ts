import request from 'supertest';
import { app } from '../app';
import fs from 'fs';
import path from 'path';
import { CLIENT_DIST_PATH } from '../app';

describe('API Endpoints', () => {
  it('should return welcome message on GET /api', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Welcome to the EveryPoll API!');
  });

  it('should attempt to serve the React app on GET /', async () => {
    const response = await request(app).get('/');

    // Check if the client/dist directory exists
    const clientDistExists =
      fs.existsSync(CLIENT_DIST_PATH) &&
      fs.existsSync(path.join(CLIENT_DIST_PATH, 'index.html'));

    if (clientDistExists) {
      // If client/dist exists, we should get a 200 response with HTML
      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/html');
    } else {
      // Otherwise, we'll get a 404 since the file doesn't exist yet
      // This is expected during development or in CI before the client is built
      expect(response.status).toBe(404);
    }
  });
});
