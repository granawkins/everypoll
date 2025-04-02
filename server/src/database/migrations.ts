import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Directory where migration files are stored
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

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
function getAvailableMigrations(): string[] {
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
function applyMigration(db: Database.Database, migrationName: string): void {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationName);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

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

  const appliedMigrations = getAppliedMigrations(db);
  const availableMigrations = getAvailableMigrations();

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
    applyMigration(db, migration);
  });

  console.log('All migrations applied successfully');
}
