import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Poll, Answer } from '../models';
import { PollAnswerCountError, PollNotFoundError } from '../../errors';

/**
 * Repository for poll-related database operations
 */
export class PollRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new poll with answers
   * @param authorId ID of the poll author
   * @param question Poll question text
   * @param answerTexts Array of answer option texts
   * @returns The created poll with its answers
   * @throws PollAnswerCountError if answer count is invalid
   */
  create(
    authorId: string,
    question: string,
    answerTexts: string[]
  ): { poll: Poll; answers: Answer[] } {
    // Validate number of answers (2-10)
    if (answerTexts.length < 2) {
      throw new PollAnswerCountError('At least 2 answer options are required');
    }
    if (answerTexts.length > 10) {
      throw new PollAnswerCountError('Maximum 10 answer options allowed');
    }

    // Start a transaction
    this.db.exec('BEGIN TRANSACTION');

    try {
      // Create the poll
      const pollId = uuidv4();
      const pollStmt = this.db.prepare(`
        INSERT INTO polls (id, author_id, question)
        VALUES (?, ?, ?)
      `);
      pollStmt.run(pollId, authorId, question);

      // Create the answers
      const answerStmt = this.db.prepare(`
        INSERT INTO answers (id, poll_id, text)
        VALUES (?, ?, ?)
      `);

      const answers: Answer[] = answerTexts.map((text) => {
        const answerId = uuidv4();
        answerStmt.run(answerId, pollId, text);
        return {
          id: answerId,
          poll_id: pollId,
          text,
        };
      });

      // Commit the transaction
      this.db.exec('COMMIT');

      const poll = this.getById(pollId);
      return { poll, answers };
    } catch (error) {
      // Rollback the transaction on error
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get a poll by ID
   * @param id Poll ID
   * @returns Poll object
   * @throws PollNotFoundError if poll not found
   */
  getById(id: string): Poll {
    const stmt = this.db.prepare('SELECT * FROM polls WHERE id = ?');
    const poll = stmt.get(id) as Poll;

    if (!poll) {
      throw new PollNotFoundError(`Poll with ID ${id} not found`);
    }

    return poll;
  }

  /**
   * Try to get a poll by ID
   * @param id Poll ID
   * @returns Poll object or null if not found
   */
  tryGetById(id: string): Poll | null {
    const stmt = this.db.prepare('SELECT * FROM polls WHERE id = ?');
    return stmt.get(id) as Poll | null;
  }

  /**
   * Get polls by author ID
   * @param authorId Author ID
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip for pagination
   * @returns Array of polls
   */
  getByAuthor(
    authorId: string,
    limit: number = 10,
    offset: number = 0
  ): Poll[] {
    const stmt = this.db.prepare(`
      SELECT * FROM polls
      WHERE author_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(authorId, limit, offset) as Poll[];
  }

  /**
   * Get all polls with pagination
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip for pagination
   * @returns Array of polls
   */
  getAll(limit: number = 10, offset: number = 0): Poll[] {
    const stmt = this.db.prepare(`
      SELECT * FROM polls
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Poll[];
  }

  /**
   * Get answers for a poll
   * @param pollId Poll ID
   * @returns Array of answers
   */
  getAnswers(pollId: string): Answer[] {
    const stmt = this.db.prepare('SELECT * FROM answers WHERE poll_id = ?');
    return stmt.all(pollId) as Answer[];
  }

  /**
   * Search polls by question text
   * @param query Search query
   * @param limit Maximum number of polls to return
   * @param offset Number of polls to skip for pagination
   * @returns Array of matching polls
   */
  search(query: string, limit: number = 10, offset: number = 0): Poll[] {
    const stmt = this.db.prepare(`
      SELECT * FROM polls
      WHERE question LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(`%${query}%`, limit, offset) as Poll[];
  }
}
