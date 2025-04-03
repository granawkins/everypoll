import { createApp } from '../app';
import { Server } from 'http';

const testApp = createApp();

let server: Server;

// Setup before tests
beforeAll((done) => {
  server = testApp.listen(0, () => {
    done();
  });
});

// Cleanup after tests
afterAll((done) => {
  server.close(done);
});
