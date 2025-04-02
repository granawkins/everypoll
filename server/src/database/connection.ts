import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTables } from './schema';
import { runMigrations } from './migrations';

// Database configuration
// For CI environments, use in-memory database to avoid all file permission issues
const isCI = process.env.CI === 'true';

// If in CI, use the current directory (which should be writable)
// Otherwise use the data directory as defined in the project structure
const DB_DIRECTORY = isCI
  ? path.join(process.cwd(), 'temp_data')
  : path.join(__dirname, '../../../data');

const DB_PATH = path.join(DB_DIRECTORY, 'everypoll.db');

// For tests in CI, use in-memory SQLite database
// This completely avoids any file permission issues in CI environments
const TEST_DB_PATH = isCI
  ? ':memory:'
  : path.join(DB_DIRECTORY, 'everypoll.test.db');

/**
 * Initialize the database - creates the database file if it doesn't exist
 * and ensures the directory structure is in place
 */
export function initializeDatabase(dbPath: string = DB_PATH): void {
  // For in-memory database, we don't need to create directories
  const isInMemory = dbPath === ':memory:';

  // Create the data directory if it doesn't exist and we're using a file-based DB
  if (!isInMemory && !fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }

  // Connect to the database - will create the file if it doesn't exist
  // For in-memory databases, this creates a new empty database in memory
  const db = new Database(dbPath);

  // Set up the database schema
  createTables(db);

  // Run any pending migrations
  runMigrations(db);

  // Close the database connection
  // Note: closing an in-memory database will delete it, but we're initializing
  // it each time in getConnection for in-memory databases
  db.close();

  console.log(`Database initialized at ${dbPath}`);
}

/**
 * Get a database connection
 * @param test If true, returns a connection to the test database
 * @returns A SQLite database connection
 */
export function getConnection(test: boolean = false): Database.Database {
  const dbPath = test ? TEST_DB_PATH : DB_PATH;
  const isInMemory = dbPath === ':memory:';

  // For in-memory databases, we always initialize since they're deleted when closed
  if (isInMemory) {
    // Create a new in-memory database and initialize it
    const db = new Database(dbPath);
    createTables(db);
    runMigrations(db);
    return db;
  }

  // For file-based databases, initialize if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    initializeDatabase(dbPath);
  }

  return new Database(dbPath);
}

/**
 * Initialize the test database - creates a fresh test database
 */
export function initializeTestDatabase(): void {
  const isInMemory = TEST_DB_PATH === ':memory:';

  // For file-based databases, delete the file if it exists
  // For in-memory databases, this step is unnecessary as they're created fresh each time
  if (!isInMemory && fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Initialize a fresh test database
  initializeDatabase(TEST_DB_PATH);

  console.log('Test database initialized');
}
