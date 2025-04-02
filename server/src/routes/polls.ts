import express from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
// @ts-expect-error - Bypass TypeScript error for Express handler compatibility
router.post('/', authenticate, requireAuth, createPoll);

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
// @ts-expect-error - Bypass TypeScript error for Express handler compatibility
router.get('/:id', authenticate, getPollById);

export default router;
