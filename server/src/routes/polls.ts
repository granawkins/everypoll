import express, { Request, Response, NextFunction } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/polls
 * Create a new poll
 * Requires authentication
 */
router.post(
  '/',
  authenticate,
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    createPoll(req, res, next);
  }
);

/**
 * GET /api/polls/:id
 * Get a poll by ID with answers and author information
 * Authentication optional
 */
router.get(
  '/:id',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    getPollById(req, res, next);
  }
);

export default router;
