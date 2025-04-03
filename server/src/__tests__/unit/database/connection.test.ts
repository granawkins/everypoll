import {
  initializeTestDatabase,
  getConnection,
  closeConnection,
  closeAllConnections,
  DbConnectionType,
} from '../../../database';
import fs from 'fs';
import path from 'path';

describe('Database Connection', () => {
  const testDirectory = path.join(__dirname, '../../../../../data');

  // Cleanup after each test
  afterEach(() => {
    closeAllConnections();
  });

  it('should create an in-memory database', () => {
    const db = initializeTestDatabase(DbConnectionType.TestInMemory);

    // Verify database is usable
    const stmt = db.prepare('SELECT 1 + 1 as result');
    const result = stmt.get() as { result: number };

    expect(result.result).toBe(2);
    expect(db.memory).toBe(true);

    // Verify tables were created
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toContain('users');
    expect(tables.map((t) => t.name)).toContain('polls');
    expect(tables.map((t) => t.name)).toContain('answers');
    expect(tables.map((t) => t.name)).toContain('votes');
  });

  it('should create a process-specific database file', () => {
    const db = initializeTestDatabase(DbConnectionType.TestProcess);
    const expectedPath = path.join(
      testDirectory,
      `everypoll.test.${process.pid}.db`
    );

    // Verify file exists
    expect(fs.existsSync(expectedPath)).toBe(true);

    // Verify database is usable
    const stmt = db.prepare('SELECT 1 + 1 as result');
    const result = stmt.get() as { result: number };

    expect(result.result).toBe(2);

    // Clean up
    closeConnection(db);
    if (fs.existsSync(expectedPath)) {
      fs.unlinkSync(expectedPath);
    }
  });

  it('should track and close connections', () => {
    // Create multiple connections
    const connections = [
      getConnection(DbConnectionType.TestInMemory),
      getConnection(DbConnectionType.TestInMemory),
      getConnection(DbConnectionType.TestProcess),
    ];

    // Verify all connections are open
    connections.forEach((db) => {
      expect(db.closed).toBe(false);
    });

    // Close all connections
    closeAllConnections();

    // Verify all connections are closed
    connections.forEach((db) => {
      expect(db.closed).toBe(true);
    });
  });
});
