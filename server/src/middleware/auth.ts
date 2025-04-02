import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt';
import { getRepositories, User } from '../database';

/**
 * Authentication middleware that verifies JWT in cookies
 * If valid JWT is found, attaches user to request and sets isAuthenticated to true
 * If no JWT or invalid JWT, creates anonymous user and sets isAuthenticated to false
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const { userRepository } = getRepositories();
  let user: User | null = null;
  let isAuthenticated = false;

  // Get token from cookies
  const token = req.cookies?.auth_token;

  if (token) {
    // Verify token
    const payload = verifyToken(token);

    if (payload) {
      // Get user from database using the userId from payload
      user = userRepository.getById(payload.userId);

      if (user) {
        isAuthenticated = true;
      }
    }
  }

  // If no valid user found, create anonymous user
  if (!user) {
    user = userRepository.createAnonymous();
  }

  // Attach user and authentication status to request
  req.user = user;
  req.isAuthenticated = isAuthenticated;

  next();
}

/**
 * Middleware to require authentication
 * Must be used after authenticate middleware
 * Returns 401 if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
}
