/**
 * Authentication middleware
 */
import { Request, Response, NextFunction } from 'express';
import { getRepositories, User } from '../database';
import { verifyToken } from './jwt';

// Extend Express Request interface to include user property
// Use module augmentation instead of global namespace
import 'express';
declare module 'express' {
  interface Request {
    user?: User;
    isAuthenticated: () => boolean;
    logoutError?: boolean; // Added for test purposes
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
export function authenticate(options: { requireAuth?: boolean } = {}) {
  const { requireAuth = false } = options;
  const { userRepository } = getRepositories();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Check for existing user in session (set by Passport)
    if (req.user) {
      return next();
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
          return next();
        } catch {
          // User not found, token may be invalid - no need to capture the error
          if (requireAuth) {
            return res
              .status(401)
              .json({ error: 'Invalid authentication token' });
          }
        }
      }
    }

    // No authentication found
    if (requireAuth) {
      return res.status(401).json({ error: 'Authentication required' });
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
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.email) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}
