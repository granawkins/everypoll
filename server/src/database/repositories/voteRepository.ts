import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Vote } from '../models';

/**
 * Repository for vote-related database operations
 */
export class VoteRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Record a vote for a poll
   * @param userId User ID
   * @param pollId Poll ID
   * @param answerId Answer ID
   * @returns The created vote
   * @throws Error if the user has already voted on this poll
   */
  create(userId: string, pollId: string, answerId: string): Vote {
    const id = uuidv4();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO votes (id, poll_id, answer_id, user_id)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(id, pollId, answerId, userId);

      return this.getById(id);
    } catch (error: unknown) {
      // Check if error is due to unique constraint violation on votes table
      // Handle different possible error message formats across environments
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint failed') ||
          error.message.includes('votes.poll_id, votes.user_id') ||
          error.message.includes('SQLITE_CONSTRAINT') ||
          // Check if it's a uniqueness constraint error related to votes table
          (error.message.toLowerCase().includes('unique') &&
            error.message.toLowerCase().includes('constraint') &&
            error.message.toLowerCase().includes('votes')))
      ) {
        throw new Error('User has already voted on this poll');
      }
      throw error;
    }
  }

  /**
   * Get a vote by ID
   * @param id Vote ID
   * @returns Vote object or null if not found
   */
  getById(id: string): Vote {
    const stmt = this.db.prepare('SELECT * FROM votes WHERE id = ?');
    return stmt.get(id) as Vote;
  }

  /**
   * Check if a user has voted on a poll
   * @param userId User ID
   * @param pollId Poll ID
   * @returns True if the user has voted on the poll, false otherwise
   */
  hasVoted(userId: string, pollId: string): boolean {
    const stmt = this.db.prepare(
      'SELECT 1 FROM votes WHERE user_id = ? AND poll_id = ?'
    );
    return !!stmt.get(userId, pollId);
  }

  /**
   * Get a user's vote on a poll
   * @param userId User ID
   * @param pollId Poll ID
   * @returns Vote object or null if not found
   */
  getUserVote(userId: string, pollId: string): Vote | null {
    const stmt = this.db.prepare(
      'SELECT * FROM votes WHERE user_id = ? AND poll_id = ?'
    );
    return stmt.get(userId, pollId) as Vote | null;
  }

  /**
   * Get all votes for a poll
   * @param pollId Poll ID
   * @returns Array of votes
   */
  getPollVotes(pollId: string): Vote[] {
    const stmt = this.db.prepare('SELECT * FROM votes WHERE poll_id = ?');
    return stmt.all(pollId) as Vote[];
  }

  /**
   * Count votes for each answer in a poll
   * @param pollId Poll ID
   * @returns Object mapping answer IDs to vote counts
   */
  countVotesByAnswer(pollId: string): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT answer_id, COUNT(*) as count
      FROM votes
      WHERE poll_id = ?
      GROUP BY answer_id
    `);

    const rows = stmt.all(pollId) as { answer_id: string; count: number }[];

    return rows.reduce(
      (counts, row) => {
        counts[row.answer_id] = row.count;
        return counts;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Count total votes for a poll
   * @param pollId Poll ID
   * @returns Total number of votes
   */
  countTotalVotes(pollId: string): number {
    const stmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM votes WHERE poll_id = ?'
    );
    const result = stmt.get(pollId) as { count: number };
    return result.count;
  }

  /**
   * Get votes for a poll filtered by votes on another poll
   * Used for cross-referencing polls
   * @param targetPollId ID of the poll to get votes for
   * @param referencePollId ID of the poll to filter by
   * @param referenceAnswerId Optional answer ID in the reference poll to filter by
   * @returns Object mapping answer IDs to vote counts
   */
  getCrossReferencedVotes(
    targetPollId: string,
    referencePollId: string,
    referenceAnswerId?: string
  ): Record<string, number> {
    let sql = `
      SELECT v1.answer_id, COUNT(*) as count
      FROM votes v1
      JOIN votes v2 ON v1.user_id = v2.user_id
      WHERE v1.poll_id = ? AND v2.poll_id = ?
    `;

    const params: string[] = [targetPollId, referencePollId];

    if (referenceAnswerId) {
      sql += ' AND v2.answer_id = ?';
      params.push(referenceAnswerId);
    }

    sql += ' GROUP BY v1.answer_id';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as { answer_id: string; count: number }[];

    return rows.reduce(
      (counts, row) => {
        counts[row.answer_id] = row.count;
        return counts;
      },
      {} as Record<string, number>
    );
  }
}
