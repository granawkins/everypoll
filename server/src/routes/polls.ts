import express, { Request, Response, NextFunction } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Define proper type for controller functions
type ControllerFunction = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;

// Create Express-compatible handler wrappers
const asyncHandler =
  (fn: ControllerFunction) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post('/', authenticate, requireAuth, asyncHandler(createPoll));

/**
 * GET /api/polls/:id
 * Get a poll by ID with its answers, author info, and vote counts
 * Authentication optional (to check if user has voted)
 */
router.get('/:id', authenticate, asyncHandler(getPollById));

export default router;
