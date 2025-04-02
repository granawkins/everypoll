import { Request, Response, NextFunction } from 'express';
import { createPoll, getPollById } from '../../controllers/polls';

/**
 * Express-compatible handler for creating a poll
 * This function is designed specifically to be used as Express middleware
 */
export function handleCreatePoll(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Simply delegate to the controller
  createPoll(req, res, next);
}

/**
 * Express-compatible handler for getting a poll by ID
 * This function is designed specifically to be used as Express middleware
 */
export function handleGetPollById(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Simply delegate to the controller
  getPollById(req, res, next);
}
