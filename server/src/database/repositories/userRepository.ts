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
   * @param googleId Optional Google ID for OAuth
   * @returns The created user
   */
  create(
    email: string | null = null,
    name: string | null = null,
    googleId: string | null = null
  ): User {
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, google_id)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, email, name, googleId);

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
   * Get a user by Google ID
   * @param googleId Google ID from OAuth
   * @returns User object or null if not found
   */
  getByGoogleId(googleId: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId) as User | null;
  }

  /**
   * Update a user's information
   * @param id User ID
   * @param email New email (optional)
   * @param name New name (optional)
   * @param googleId New Google ID (optional)
   * @returns Updated user object
   */
  update(id: string, email?: string, name?: string, googleId?: string): User {
    // Build the update statement dynamically based on provided fields
    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (googleId !== undefined) {
      updates.push('google_id = ?');
      params.push(googleId);
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
