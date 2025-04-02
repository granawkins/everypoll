import { Request, Response } from 'express';
import { getRepositories } from '../database';
import { generateToken } from '../services/jwt';

/**
 * Get current user
 * Returns authenticated user or anonymous user if no valid JWT
 */
export function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(500).json({ error: 'User not available' });
  }

  // Return user info with authentication status
  return res.json({
    user: req.user,
    isAuthenticated: req.isAuthenticated,
  });
}

/**
 * Logout user by clearing auth cookie
 */
export function logout(req: Request, res: Response) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  // Return success message
  return res.json({ message: 'Logged out successfully' });
}

/**
 * Login as specified user (for testing purposes only)
 * In PR3, this will be replaced with Google OAuth
 */
export function login(req: Request, res: Response) {
  // This is a simplified login for testing - will be replaced with Google OAuth
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const { userRepository } = getRepositories();
  let user = userRepository.getByEmail(email);

  // Create user if doesn't exist
  if (!user) {
    user = userRepository.create(email, name || email.split('@')[0]);
  }

  // Generate JWT
  const token = generateToken(user.id);

  // Set JWT as HTTP-only cookie
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict',
  });

  // Return user info
  return res.json({
    user,
    isAuthenticated: true,
  });
}
