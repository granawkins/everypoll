/**
 * Custom error classes for database operations
 * These provide consistent error types and messages across environments
 */

/**
 * Base class for all database errors
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    // Ensures proper inheritance in ES5
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Error thrown when a database constraint is violated
 */
export class ConstraintError extends DatabaseError {
  readonly code: string;

  constructor(message: string, code: string = 'CONSTRAINT_ERROR') {
    super(message);
    this.name = 'ConstraintError';
    this.code = code;
    Object.setPrototypeOf(this, ConstraintError.prototype);
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueConstraintError extends ConstraintError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'UNIQUE_CONSTRAINT_ERROR');
    this.name = 'UniqueConstraintError';
    this.field = field;
    Object.setPrototypeOf(this, UniqueConstraintError.prototype);
  }
}

/**
 * Error thrown when a foreign key constraint is violated
 */
export class ForeignKeyConstraintError extends ConstraintError {
  readonly table?: string;
  readonly foreignKey?: string;

  constructor(message: string, table?: string, foreignKey?: string) {
    super(message, 'FOREIGN_KEY_CONSTRAINT_ERROR');
    this.name = 'ForeignKeyConstraintError';
    this.table = table;
    this.foreignKey = foreignKey;
    Object.setPrototypeOf(this, ForeignKeyConstraintError.prototype);
  }
}

/**
 * Error thrown when a record is not found
 */
export class NotFoundError extends DatabaseError {
  readonly id?: string;
  readonly resource?: string;

  constructor(message: string, resource?: string, id?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when parameters are invalid
 */
export class ValidationError extends DatabaseError {
  readonly field?: string;
  readonly value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when a user has already voted on a poll
 */
export class AlreadyVotedError extends UniqueConstraintError {
  readonly userId: string;
  readonly pollId: string;

  constructor(userId: string, pollId: string) {
    super('User has already voted on this poll');
    this.name = 'AlreadyVotedError';
    this.userId = userId;
    this.pollId = pollId;
    Object.setPrototypeOf(this, AlreadyVotedError.prototype);
  }
}

/**
 * Helper function to convert SQLite errors to our custom error types
 */
export function convertSQLiteError(
  error: unknown,
  context?: Record<string, unknown>
): Error {
  if (!(error instanceof Error)) {
    return new DatabaseError('Unknown database error');
  }

  const errorMessage = error.message;

  // SQLite constraint errors
  if (errorMessage.includes('UNIQUE constraint failed')) {
    // Special case for votes unique constraint
    if (
      errorMessage.includes('votes.poll_id, votes.user_id') &&
      context &&
      typeof context.userId === 'string' &&
      typeof context.pollId === 'string'
    ) {
      return new AlreadyVotedError(
        context.userId as string,
        context.pollId as string
      );
    }
    return new UniqueConstraintError(errorMessage);
  }

  if (errorMessage.includes('FOREIGN KEY constraint failed')) {
    return new ForeignKeyConstraintError(errorMessage);
  }

  if (errorMessage.includes('CHECK constraint failed')) {
    return new ConstraintError(errorMessage);
  }

  // Return the original error if we can't convert it
  return error;
}
