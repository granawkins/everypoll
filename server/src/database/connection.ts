import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTables } from './schema';
import { runMigrations } from './migrations';

// Database configuration
const DB_DIRECTORY = path.join(__dirname, '../../../data');
const DB_PATH = path.join(DB_DIRECTORY, 'everypoll.db');
const TEST_DB_PATH = ':memory:'; // In-memory database for tests

// Track existing in-memory test database connections to allow sharing across tests
let inMemoryTestDb: Database.Database | null = null;

/**
 * Initialize a file-based database - creates the database file if it doesn't exist
 * and ensures the directory structure is in place
 */
export function initializeDatabase(dbPath: string = DB_PATH): void {
  // Skip directory creation for in-memory database
  if (dbPath !== ':memory:') {
    // Create the data directory if it doesn't exist
    if (!fs.existsSync(DB_DIRECTORY)) {
      fs.mkdirSync(DB_DIRECTORY, { recursive: true });
    }
  }

  // Connect to the database - will create the file if it doesn't exist
  const db = new Database(dbPath);

  // Set up the database schema
  createTables(db);

  // Run any pending migrations
  runMigrations(db);

  // For file-based databases, close the connection after initialization
  // For in-memory databases, keep the connection open
  if (dbPath !== ':memory:') {
    db.close();
    console.log(`Database initialized at ${dbPath}`);
  } else {
    console.log('In-memory database initialized');
    return db;
  }
}

/**
 * Get a database connection
 * @param test If true, returns a connection to the test database (in-memory)
 * @returns A SQLite database connection
 */
export function getConnection(test: boolean = false): Database.Database {
  if (test) {
    // For test mode, use in-memory database
    if (!inMemoryTestDb) {
      inMemoryTestDb = initializeInMemoryTestDatabase();
    }
    return inMemoryTestDb;
  } else {
    const dbPath = DB_PATH;

    // Initialize the database if it doesn't exist
    if (!fs.existsSync(dbPath)) {
      initializeDatabase(dbPath);
    }

    return new Database(dbPath);
  }
}

/**
 * Initialize an in-memory test database
 * @returns An initialized in-memory database connection
 */
function initializeInMemoryTestDatabase(): Database.Database {
  // Create a new in-memory database and initialize it
  console.log('Creating new in-memory test database');
  const db = new Database(':memory:');

  // Set up schema and run migrations
  createTables(db);
  runMigrations(db);

  return db;
}

/**
 * Initialize or reset the test database
 * For in-memory database: Clear all data but keep the connection
 */
export function initializeTestDatabase(): void {
  // If we already have an in-memory database, just drop and recreate all tables
  if (inMemoryTestDb) {
    console.log('Resetting in-memory test database');

    // Drop all existing tables
    inMemoryTestDb.exec(`
      PRAGMA foreign_keys = OFF;
      
      BEGIN TRANSACTION;
      
      DROP TABLE IF EXISTS votes;
      DROP TABLE IF EXISTS answers;
      DROP TABLE IF EXISTS polls;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS migrations;
      
      COMMIT;
      
      PRAGMA foreign_keys = ON;
    `);

    // Recreate schema
    createTables(inMemoryTestDb);
    runMigrations(inMemoryTestDb);
  } else {
    // Initialize a new in-memory database if one doesn't exist
    inMemoryTestDb = initializeInMemoryTestDatabase();
  }
}
