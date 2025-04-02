/**
 * Authentication middleware
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { getRepositories, User as DbUser } from '../database';
import { verifyToken } from './jwt';

// Extend Express Request interface to include user property
// Use module augmentation instead of global namespace
import 'express';
declare module 'express' {
  // Extend the Express User interface to match our User model
  // This ensures compatibility between Express.User and our User model
  interface User {
    id: string;
    email: string | null;
    name: string | null;
    created_at: string;
  }

  interface Request {
    // We don't need to redefine user as Express already has it
    // This is just to add the logoutError property for tests
    logoutError?: boolean;
  }
}

/**
 * Middleware to check if the user is authenticated
 * If not authenticated, either create an anonymous user or return 401
 *
 * @param options Configuration options
 * @param options.requireAuth Whether to require authentication (default: false)
 * @returns Express middleware
 */
export function authenticate(
  options: { requireAuth?: boolean } = {}
): RequestHandler {
  const { requireAuth = false } = options;
  const { userRepository } = getRepositories();

  return async function (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Check for existing user in session (set by Passport)
    if (req.user) {
      next();
      return;
    }

    // Check for authentication token (JWT) in headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload) {
        // Look up user by ID
        try {
          const user = userRepository.getById(payload.id);
          req.user = user;
          next();
          return;
        } catch {
          // User not found, token may be invalid - no need to capture the error
          if (requireAuth) {
            res.status(401).json({ error: 'Invalid authentication token' });
            return;
          }
        }
      }
    }

    // No authentication found
    if (requireAuth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // For non-protected routes, create an anonymous user if none exists
    const anonymousUser = userRepository.createAnonymous();
    req.user = anonymousUser;
    next();
  };
}

/**
 * Middleware to ensure a route is only accessible by authenticated users
 */
export const requireAuth: RequestHandler = function (
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Double-cast through unknown to our database User type
  // This is a common TypeScript pattern to bypass type compatibility issues
  const user = req.user as unknown as DbUser;
  if (user && user.email) {
    next();
    return;
  }
  res.status(401).json({ error: 'Authentication required' });
};
