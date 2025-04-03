import {
  DatabaseError,
  ConstraintError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  NotFoundError,
  AlreadyVotedError,
  convertSQLiteError,
} from '../../../errors';

describe('Database Error Classes', () => {
  it('should create basic database error', () => {
    const error = new DatabaseError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Test error');
  });

  it('should create constraint error', () => {
    const error = new ConstraintError(
      'Constraint violation',
      'TEST_CONSTRAINT'
    );

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error.name).toBe('ConstraintError');
    expect(error.code).toBe('TEST_CONSTRAINT');
  });

  it('should create unique constraint error', () => {
    const error = new UniqueConstraintError('Duplicate value', 'email');

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error).toBeInstanceOf(UniqueConstraintError);
    expect(error.field).toBe('email');
    expect(error.code).toBe('UNIQUE_CONSTRAINT_ERROR');
  });

  it('should create foreign key constraint error', () => {
    const error = new ForeignKeyConstraintError(
      'Invalid reference',
      'users',
      'author_id'
    );

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error).toBeInstanceOf(ForeignKeyConstraintError);
    expect(error.table).toBe('users');
    expect(error.foreignKey).toBe('author_id');
    expect(error.code).toBe('FOREIGN_KEY_CONSTRAINT_ERROR');
  });

  it('should create validation error', () => {
    const error = new ValidationError('Invalid value', 'age', -1);

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.field).toBe('age');
    expect(error.value).toBe(-1);
  });

  it('should create not found error', () => {
    const error = new NotFoundError('User not found', 'User', '123');

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.resource).toBe('User');
    expect(error.id).toBe('123');
  });

  it('should create already voted error', () => {
    const error = new AlreadyVotedError('user-123', 'poll-456');

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(ConstraintError);
    expect(error).toBeInstanceOf(UniqueConstraintError);
    expect(error).toBeInstanceOf(AlreadyVotedError);
    expect(error.userId).toBe('user-123');
    expect(error.pollId).toBe('poll-456');
    expect(error.message).toBe('User has already voted on this poll');
  });
});

describe('Error Conversion', () => {
  it('should convert SQLite unique constraint error to UniqueConstraintError', () => {
    const sqliteError = new Error('UNIQUE constraint failed: users.email');
    const convertedError = convertSQLiteError(sqliteError);

    expect(convertedError).toBeInstanceOf(UniqueConstraintError);
  });

  it('should convert vote constraint error to AlreadyVotedError', () => {
    const sqliteError = new Error(
      'UNIQUE constraint failed: votes.poll_id, votes.user_id'
    );
    const convertedError = convertSQLiteError(sqliteError, {
      userId: 'user-123',
      pollId: 'poll-456',
    });

    expect(convertedError).toBeInstanceOf(AlreadyVotedError);
    expect((convertedError as AlreadyVotedError).userId).toBe('user-123');
    expect((convertedError as AlreadyVotedError).pollId).toBe('poll-456');
  });

  it('should convert foreign key constraint error', () => {
    const sqliteError = new Error('FOREIGN KEY constraint failed');
    const convertedError = convertSQLiteError(sqliteError);

    expect(convertedError).toBeInstanceOf(ForeignKeyConstraintError);
  });

  it('should pass through non-constraint errors', () => {
    const originalError = new Error('Some other error');
    const convertedError = convertSQLiteError(originalError);

    expect(convertedError).toBe(originalError);
  });

  it('should handle non-Error objects', () => {
    const nonError = 'Not an error';
    const convertedError = convertSQLiteError(nonError);

    expect(convertedError).toBeInstanceOf(DatabaseError);
    expect(convertedError.message).toBe('Unknown database error');
  });
});
