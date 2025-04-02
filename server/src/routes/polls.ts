import express, { Request, Response } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
// Use type assertion to force TypeScript to accept the handler
router.post('/', authenticate, requireAuth, createPoll as any);

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
// Use type assertion to force TypeScript to accept the handler
router.get('/:id', authenticate, getPollById as any);

export default router;
