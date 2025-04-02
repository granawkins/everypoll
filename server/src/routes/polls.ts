import express from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, (req, res) => {
  return createPoll(req, res);
});

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
router.get('/:id', authenticate, (req, res) => {
  return getPollById(req, res);
});

export default router;
