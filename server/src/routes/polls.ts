import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Create route handler functions that explicitly match Express's expectations
const createPollHandler: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  createPoll(req, res, next);
  // Explicitly return nothing to satisfy TypeScript
  return;
};

const getPollByIdHandler: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  getPollById(req, res, next);
  // Explicitly return nothing to satisfy TypeScript
  return;
};

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post(
  '/',
  authenticate,
  requireAuth,
  createPollHandler as RequestHandler
);

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get('/:id', authenticate, getPollByIdHandler as RequestHandler);

export default router;
