import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTables } from './schema';
import { runMigrations } from './migrations';

// Database configuration
const DB_DIRECTORY = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DB_DIRECTORY, 'everypoll.db');

// Track open connections and their status to ensure proper cleanup
const openConnections: Database.Database[] = [];
const closedConnections = new Set<Database.Database>();

// Utility to check if a connection is closed
function isConnectionClosed(db: Database.Database): boolean {
  try {
    // Try to execute a simple pragma query - will throw if connection is closed
    db.pragma('schema_version');
    return false;
  } catch {
    // If query throws, the connection is closed
    return true;
  }
}

// Connection options
export enum DbConnectionType {
  Default = 'default', // Regular file-based DB
  Test = 'test', // File-based test DB
  TestInMemory = 'test-memory', // In-memory test DB
  TestProcess = 'test-process', // Process-specific file-based test DB
}

/**
 * Creates a connection URI for the specified connection type
 */
export function getDatabasePath(
  type: DbConnectionType = DbConnectionType.Default
): string {
  switch (type) {
    case DbConnectionType.Default:
      return DB_PATH;
    case DbConnectionType.Test:
      return path.join(DB_DIRECTORY, 'everypoll.test.db');
    case DbConnectionType.TestInMemory:
      return ':memory:';
    case DbConnectionType.TestProcess:
      // Create a unique file name based on process ID to avoid conflicts in parallel tests
      return path.join(DB_DIRECTORY, `everypoll.test.${process.pid}.db`);
    default:
      return DB_PATH;
  }
}

/**
 * Initialize the database - creates the database file if it doesn't exist
 * and ensures the directory structure is in place
 */
export function initializeDatabase(
  connectionType: DbConnectionType = DbConnectionType.Default
): Database.Database {
  const dbPath = getDatabasePath(connectionType);

  // Create the data directory if it doesn't exist (for file-based DBs)
  if (dbPath !== ':memory:' && !fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }

  // Connect to the database - will create the file if it doesn't exist
  const db = new Database(dbPath);

  // Set up the database schema
  createTables(db);

  // Run any pending migrations (skip for in-memory DBs in tests to speed things up)
  if (connectionType === DbConnectionType.Default) {
    runMigrations(db);
  }

  if (connectionType !== DbConnectionType.Default) {
    // Track non-default connections for cleanup
    openConnections.push(db);
  }

  // For in-memory databases, we must return the connection since
  // closing it would destroy the database
  if (dbPath === ':memory:') {
    return db;
  }

  // For file-based databases, we can close the connection after initialization
  if (connectionType === DbConnectionType.Default) {
    db.close();
    console.log(`Database initialized at ${dbPath}`);
    return db;
  }

  console.log(`Test database initialized at ${dbPath}`);
  return db;
}

/**
 * Get a database connection
 * @param connectionType Type of database connection to create
 * @returns A SQLite database connection
 */
export function getConnection(
  connectionType: DbConnectionType = DbConnectionType.Default
): Database.Database {
  const dbPath = getDatabasePath(connectionType);

  // For in-memory databases, we always need to initialize
  if (dbPath === ':memory:') {
    return initializeDatabase(connectionType);
  }

  // For file-based databases, initialize if it doesn't exist
  if (!fs.existsSync(dbPath) && dbPath !== ':memory:') {
    initializeDatabase(connectionType);
  }

  const db = new Database(dbPath);

  // Track non-default connections for cleanup
  if (connectionType !== DbConnectionType.Default) {
    openConnections.push(db);
  }

  return db;
}

/**
 * Initialize a test database with the specified connection type
 */
export function initializeTestDatabase(
  connectionType: DbConnectionType = DbConnectionType.TestInMemory
): Database.Database {
  const dbPath = getDatabasePath(connectionType);

  // For file-based test databases, remove existing file if it exists
  if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Initialize a fresh test database
  return initializeDatabase(connectionType);
}

/**
 * Close all open database connections
 */
export function closeAllConnections(): void {
  openConnections.forEach((db) => {
    try {
      if (db && !isConnectionClosed(db)) {
        db.close();
        closedConnections.add(db);
      }
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  });

  // Clear the connections array
  openConnections.length = 0;
}

/**
 * Close specific database connection
 */
export function closeConnection(db: Database.Database): void {
  try {
    if (db && !isConnectionClosed(db)) {
      db.close();
      closedConnections.add(db);
    }
  } catch (error) {
    console.error('Error closing database connection:', error);
  }

  // Remove from connections array
  const index = openConnections.indexOf(db);
  if (index !== -1) {
    openConnections.splice(index, 1);
  }
}
