import express, { RequestHandler } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Type assertion helper - forces Express to recognize our handlers as RequestHandler
const handler = (fn: RequestHandler): RequestHandler => fn;

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, handler(createPoll));

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
router.get('/:id', authenticate, handler(getPollById));

export default router;
