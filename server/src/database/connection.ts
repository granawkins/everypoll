import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTables } from './schema';
import { runMigrations } from './migrations';

// Database configuration
// For CI environments, use a writable temp directory to avoid permission issues
const isCI = process.env.CI === 'true';

// If in CI, use the current directory (which should be writable)
// Otherwise use the data directory as defined in the project structure
const DB_DIRECTORY = isCI
  ? path.join(process.cwd(), 'temp_data')
  : path.join(__dirname, '../../../data');

const DB_PATH = path.join(DB_DIRECTORY, 'everypoll.db');
const TEST_DB_PATH = path.join(DB_DIRECTORY, 'everypoll.test.db');

/**
 * Initialize the database - creates the database file if it doesn't exist
 * and ensures the directory structure is in place
 */
export function initializeDatabase(dbPath: string = DB_PATH): void {
  // Create the data directory if it doesn't exist
  if (!fs.existsSync(DB_DIRECTORY)) {
    fs.mkdirSync(DB_DIRECTORY, { recursive: true });
  }

  // Connect to the database - will create the file if it doesn't exist
  const db = new Database(dbPath);

  // Set up the database schema
  createTables(db);

  // Run any pending migrations
  runMigrations(db);

  // Close the database connection
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

  // Initialize the database if it doesn't exist
  if (!fs.existsSync(dbPath)) {
    initializeDatabase(dbPath);
  }

  return new Database(dbPath);
}

/**
 * Initialize the test database - creates a fresh test database
 */
export function initializeTestDatabase(): void {
  // Delete the test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  // Initialize a fresh test database
  initializeDatabase(TEST_DB_PATH);

  console.log('Test database initialized');
}
