import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Wrap controller with a function that explicitly has RequestHandler type
const wrapControllerAsMiddleware = (
  /* eslint-disable @typescript-eslint/no-explicit-any */
  controller: any
): RequestHandler => {
  // Return an explicitly typed function that TypeScript definitely understands
  const middleware: RequestHandler = (req, res, next) => {
    controller(req, res, next);
  };
  return middleware;
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
  wrapControllerAsMiddleware(createPoll)
);

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get('/:id', authenticate, wrapControllerAsMiddleware(getPollById));

export default router;
