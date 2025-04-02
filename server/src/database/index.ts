import {
  getConnection,
  initializeDatabase,
  initializeTestDatabase,
} from './connection';
import { createTables } from './schema';
import { runMigrations } from './migrations';
import { UserRepository } from './repositories/userRepository';
import { PollRepository } from './repositories/pollRepository';
import { VoteRepository } from './repositories/voteRepository';
import { User, Poll, Answer, Vote } from './models';

// Initialize the database at startup
if (process.env.NODE_ENV !== 'test') {
  try {
    initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Export types
export type { User, Poll, Answer, Vote };

// Export database connection functions
export { getConnection, initializeDatabase, initializeTestDatabase };

// Export repository classes
export { UserRepository, PollRepository, VoteRepository };

// Helper function to get repository instances
export function getRepositories(test: boolean = false) {
  const db = getConnection(test);
  return {
    userRepository: new UserRepository(db),
    pollRepository: new PollRepository(db),
    voteRepository: new VoteRepository(db),
    db, // Export the database connection for direct use if needed
  };
}
