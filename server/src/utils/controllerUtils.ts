import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps a controller function to ensure it matches the Express RequestHandler signature
 * This resolves TypeScript issues with controller functions that might return Response objects
 */
export function wrapController(
  controller: (req: Request, res: Response, next?: NextFunction) => void
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      controller(req, res, next);
    } catch (error) {
      console.error('Controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
