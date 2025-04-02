/**
 * Authentication controllers for handling auth-related requests
 */
import { Request, Response, RequestHandler } from 'express';
import passport from 'passport';
import { getRepositories, User } from '../database';
import { generateToken } from './jwt';

/**
 * Get current user information
 * If no user is authenticated, returns anonymous user
 */
export const getCurrentUser: RequestHandler = function (
  req: Request,
  res: Response
): void {
  // If the user is not authenticated, create an anonymous user
  if (!req.user) {
    const { userRepository } = getRepositories();
    const anonymousUser = userRepository.createAnonymous();
    res.json({ user: anonymousUser, isAuthenticated: false });
    return;
  }

  // Return authenticated user
  // Cast Express.User to our database User type
  const user = req.user as User;
  res.json({
    user: req.user,
    isAuthenticated: !!user.email,
    token: generateToken(user),
  });
};

/**
 * Initiate Google OAuth authentication
 */
export const googleLogin: RequestHandler = function (
  req: Request,
  res: Response
): void {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: true,
  })(req, res);
};

/**
 * Handle Google OAuth callback
 */
export const googleCallback: RequestHandler = function (
  req: Request,
  res: Response
  // NextFunction parameter removed as it's not needed
): void {
  passport.authenticate('google', {
    failureRedirect: '/',
    session: true,
  })(req, res, () => {
    // Successful authentication, redirect home or to the originally requested page
    const redirectUrl = req.session.returnTo || '/';
    if (req.session.returnTo) {
      delete req.session.returnTo;
    }
    res.redirect(redirectUrl);
  });
};

/**
 * Logout user
 */
export const logout: RequestHandler = function (
  req: Request,
  res: Response
): void {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
};
