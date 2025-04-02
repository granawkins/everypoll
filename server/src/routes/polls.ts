import express, { RequestHandler } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Cast controller functions to the RequestHandler type to satisfy TypeScript
const createPollHandler = createPoll as RequestHandler;
const getPollByIdHandler = getPollById as RequestHandler;

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, createPollHandler);

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get('/:id', authenticate, getPollByIdHandler);

export default router;
