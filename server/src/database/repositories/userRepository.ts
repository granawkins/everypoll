import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';

/**
 * Repository for user-related database operations
 */
export class UserRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new user
   * @param email Optional email address
   * @param name Optional display name
   * @returns The created user
   */
  create(email: string | null = null, name: string | null = null): User {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name)
      VALUES (?, ?, ?)
    `);

    stmt.run(id, email, name);

    return this.getById(id);
  }

  /**
   * Create an anonymous user (without email and name)
   * @returns The created anonymous user
   */
  createAnonymous(): User {
    return this.create();
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns User object or null if not found
   */
  getById(id: string): User {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User;
  }

  /**
   * Get a user by email
   * @param email User email
   * @returns User object or null if not found
   */
  getByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  /**
   * Update a user's information
   * @param id User ID
   * @param email New email (optional)
   * @param name New name (optional)
   * @returns Updated user object
   */
  update(id: string, email?: string, name?: string): User {
    // Build the update statement dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (updates.length === 0) {
      return this.getById(id); // Nothing to update
    }

    // Add ID to parameters
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    return this.getById(id);
  }
}
