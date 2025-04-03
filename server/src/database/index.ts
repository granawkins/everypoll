import {
  getConnection,
  initializeDatabase,
  initializeTestDatabase,
  closeAllConnections,
  closeConnection,
  DbConnectionType,
} from './connection';
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
export {
  getConnection,
  initializeDatabase,
  initializeTestDatabase,
  closeAllConnections,
  closeConnection,
  DbConnectionType,
};

// Export repository classes
export { UserRepository, PollRepository, VoteRepository };

/**
 * Options for repository initialization
 */
export interface RepositoryOptions {
  connectionType?: DbConnectionType;
  keepConnectionOpen?: boolean;
}

// Repository cache to prevent creating multiple instances
const repositoryCache = new Map<string, any>();

/**
 * Helper function to get repository instances
 * @param options Configuration options for repositories
 * @returns Repository instances and database connection
 */
export function getRepositories(options: RepositoryOptions | boolean = {}) {
  // Handle legacy boolean parameter (for backward compatibility)
  if (typeof options === 'boolean') {
    options = {
      connectionType: options
        ? DbConnectionType.Test
        : DbConnectionType.Default,
    };
  } else {
    // Set defaults for options
    options = {
      connectionType: DbConnectionType.Default,
      keepConnectionOpen: false,
      ...options,
    };
  }

  const { connectionType, keepConnectionOpen } = options as RepositoryOptions;

  // For in-memory databases, we always need to keep the connection open
  const shouldKeepOpen =
    keepConnectionOpen || connectionType === DbConnectionType.TestInMemory;

  // Get connection based on connection type
  const db = getConnection(connectionType);

  // Create repositories with the database connection
  const userRepository = new UserRepository(db);
  const pollRepository = new PollRepository(db);
  const voteRepository = new VoteRepository(db);

  // Create a cleanup function that will close the connection if needed
  const cleanup = () => {
    if (!shouldKeepOpen) {
      closeConnection(db);
    }
  };

  return {
    userRepository,
    pollRepository,
    voteRepository,
    db,
    cleanup,
  };
}
