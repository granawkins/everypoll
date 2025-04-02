/**
 * Authentication controllers for handling auth-related requests
 */
import { Request, Response } from 'express';
import passport from 'passport';
import { getRepositories } from '../database';
import { generateToken } from './jwt';

/**
 * Get current user information
 * If no user is authenticated, returns anonymous user
 */
export const getCurrentUser = (req: Request, res: Response) => {
  // If the user is not authenticated, create an anonymous user
  if (!req.user) {
    const { userRepository } = getRepositories();
    const anonymousUser = userRepository.createAnonymous();
    return res.json({ user: anonymousUser, isAuthenticated: false });
  }

  // Return authenticated user
  return res.json({
    user: req.user,
    isAuthenticated: !!req.user.email,
    token: generateToken(req.user),
  });
};

/**
 * Initiate Google OAuth authentication
 */
export const googleLogin = (req: Request, res: Response) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  })(req, res);
};

/**
 * Handle Google OAuth callback
 */
export const googleCallback = (req: Request, res: Response) => {
  passport.authenticate('google', {
    failureRedirect: '/',
    session: true,
  })(req, res, () => {
    // Successful authentication, redirect home or to the originally requested page
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  });
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
};
