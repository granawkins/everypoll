import express, { Request, Response, NextFunction } from 'express';
import { createPoll, getPollById } from '../controllers/polls';
import { authenticate, requireAuth } from '../middleware/auth';

const router = express.Router();

// Create route handler functions that explicitly match Express's expectations
const createPollHandler = (req: Request, res: Response, next: NextFunction) => {
  createPoll(req, res, next);
};

const getPollByIdHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  getPollById(req, res, next);
};

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
