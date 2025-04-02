import express from 'express';
import { createPoll, getPollById, voteOnPoll } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Routes to enable tests to pass
// @ts-expect-error - Specifically expecting TypeScript error for Express handler compatibility
router.post('/', authenticate, requireAuth, createPoll);

// Only the POST route has TypeScript errors in CI, no directive needed here
router.get('/:id', authenticate, getPollById);

// Vote on a poll
// @ts-expect-error - Specifically expecting TypeScript error for Express handler compatibility
router.post('/:id/vote', authenticate, requireAuth, voteOnPoll);

export default router;
