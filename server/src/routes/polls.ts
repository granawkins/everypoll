import express from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';
import { wrapController } from '../utils/controllerUtils';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, wrapController(createPoll));

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get('/:id', authenticate, wrapController(getPollById));

export default router;
