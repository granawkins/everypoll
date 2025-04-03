/**
 * Global cleanup after all tests have completed
 * This ensures that all database connections are properly closed
 */
import { closeAllConnections } from '../database';

// Global cleanup to run after all tests
afterAll(async () => {
  // Close all database connections
  closeAllConnections();

  // Add a small delay to ensure all connections are properly closed
  await new Promise((resolve) => setTimeout(resolve, 100));
});
