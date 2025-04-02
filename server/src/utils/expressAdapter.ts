import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Creates an Express-compatible middleware from any function
 * Uses a more aggressive type approach that's guaranteed to work with Express
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export const adaptController = (controllerFn: Function): RequestHandler => {
  // Use explicit type assertion to guarantee TypeScript compatibility
  const handler: RequestHandler = (req, res, next) => {
    try {
      // Call the controller but don't return anything
      // Use type assertion to bypass TypeScript's inference
      (
        controllerFn as (
          req: Request,
          res: Response,
          next: NextFunction
        ) => void
      )(req, res, next);
    } catch (error) {
      // Handle any errors
      console.error('Controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  return handler;
};
