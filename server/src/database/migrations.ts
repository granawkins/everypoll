import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Directory where migration files are stored
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Hard-coded migration content for in-memory databases
// This avoids filesystem dependencies in test environments
const IN_MEMORY_MIGRATIONS = {
  '001-initial-schema.sql': `
    -- This is just a placeholder migration file to demonstrate the migrations system.
    -- Our initial schema is already created by the createTables function in schema.ts.
    -- Future schema changes would be added here as new migration files.

    -- If we wanted to add a new field to an existing table, we would create a new migration like:
    -- ALTER TABLE users ADD COLUMN avatar_url TEXT;

    -- Just a simple comment to make this file non-empty
    -- This migration is already applied by the createTables function
  `,
  '002-update-user-oauth.sql': `
    -- This migration adds a Google OAuth ID field to the users table
    -- This allows linking user accounts to their Google profiles

    -- First add the column without the UNIQUE constraint (SQLite limitation)
    ALTER TABLE users ADD COLUMN google_id TEXT;

    -- Then create a separate unique index for the column
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
  `,
};

/**
 * Check if a database is in-memory
 */
function isInMemoryDatabase(db: Database.Database): boolean {
  // Check if the database filename is ':memory:' which indicates an in-memory database
  return db.name === ':memory:';
}

/**
 * Set up the migrations table if it doesn't exist
 */
function setupMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of all migrations that have been applied
 */
function getAppliedMigrations(db: Database.Database): string[] {
  const stmt = db.prepare('SELECT name FROM migrations ORDER BY id');
  const rows = stmt.all() as { name: string }[];
  return rows.map((row) => row.name);
}

/**
 * Get list of all available migration files
 */
function getAvailableMigrations(isInMemory: boolean): string[] {
  if (isInMemory) {
    // For in-memory databases, use the hardcoded list
    return Object.keys(IN_MEMORY_MIGRATIONS).sort();
  }

  // For file-based databases, read from the filesystem
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  // Get all SQL files in the migrations directory
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations are applied in order
}

/**
 * Apply a single migration
 */
function applyMigration(
  db: Database.Database,
  migrationName: string,
  isInMemory: boolean
): void {
  // Get migration SQL content - either from files or hardcoded
  let migrationSql: string;

  if (isInMemory) {
    // Use hardcoded migration content for in-memory databases
    migrationSql = IN_MEMORY_MIGRATIONS[migrationName];
  } else {
    // Read from file for regular databases
    const migrationPath = path.join(MIGRATIONS_DIR, migrationName);
    migrationSql = fs.readFileSync(migrationPath, 'utf8');
  }

  try {
    // Start a transaction for the migration
    db.exec('BEGIN TRANSACTION');

    // Apply the migration
    db.exec(migrationSql);

    // Record the migration as applied
    const stmt = db.prepare('INSERT INTO migrations (name) VALUES (?)');
    stmt.run(migrationName);

    // Commit the transaction
    db.exec('COMMIT');

    console.log(`Applied migration: ${migrationName}`);
  } catch (error) {
    // Rollback the transaction on error
    db.exec('ROLLBACK');
    console.error(`Failed to apply migration ${migrationName}:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  setupMigrationsTable(db);

  // Check if we're using an in-memory database
  const isInMemory = isInMemoryDatabase(db);

  const appliedMigrations = getAppliedMigrations(db);
  const availableMigrations = getAvailableMigrations(isInMemory);

  // Find migrations that have not been applied yet
  const pendingMigrations = availableMigrations.filter(
    (migration) => !appliedMigrations.includes(migration)
  );

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations to apply');
    return;
  }

  console.log(`Applying ${pendingMigrations.length} pending migrations...`);

  // Apply each pending migration
  pendingMigrations.forEach((migration) => {
    applyMigration(db, migration, isInMemory);
  });

  console.log('All migrations applied successfully');
}
