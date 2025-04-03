// Set test environment variables
process.env.NODE_ENV = 'test';

// Import cleanup to ensure it runs after all tests
import './jest.cleanup';

// Increase timeout for all tests
jest.setTimeout(10000);
