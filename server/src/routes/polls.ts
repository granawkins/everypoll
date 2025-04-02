import express, { Request, Response, NextFunction } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

// Express request handler type
type ExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
// Simple handler that doesn't return anything
const createPollHandler: ExpressHandler = async (req, res) => {
  await createPoll(req, res);
};

router.post('/', authenticate, requireAuth, createPollHandler);

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
// Simple handler that doesn't return anything
const getPollHandler: ExpressHandler = async (req, res) => {
  await getPollById(req, res);
};

router.get('/:id', authenticate, getPollHandler);

export default router;
