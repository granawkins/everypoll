import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Creates an Express-compatible middleware that ensures nothing is returned to Express
 * This isolates controller logic from Express type requirements
 */
export function adaptController(
  controllerFn: (req: Request, res: Response, next: NextFunction) => any
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Call the controller but don't return anything to Express
    try {
      // Ignore any return value from the controller
      controllerFn(req, res, next);
      // Explicitly return nothing
      return;
    } catch (error) {
      // Handle any errors
      console.error('Controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  };
}
