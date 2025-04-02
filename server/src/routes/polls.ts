import express from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';
import { adaptController } from '../utils/expressAdapter';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, adaptController(createPoll));

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get('/:id', authenticate, adaptController(getPollById));

export default router;
