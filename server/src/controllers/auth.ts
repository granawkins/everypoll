import { Request, Response } from 'express';
import { getRepositories } from '../database';
import { generateToken } from '../services/jwt';
import { generateAuthUrl } from '../services/google/config';
import { exchangeCodeForTokens, getUserInfo } from '../services/google/auth';
import crypto from 'crypto';

/**
 * Get current user
 * Returns authenticated user or anonymous user if no valid JWT
 */
export function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    res.status(500).json({ error: 'User not available' });
    return;
  }

  // Return user info with authentication status
  res.json({
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
  res.json({ message: 'Logged out successfully' });
}

/**
 * Login as specified user (for testing purposes only)
 * This is a simplified login for testing - Google OAuth is the recommended method
 */
export function login(req: Request, res: Response) {
  const { email, name } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
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
  res.json({
    user,
    isAuthenticated: true,
  });
}

/**
 * Redirect to Google's OAuth login page
 */
export function googleLogin(req: Request, res: Response) {
  // Generate a random state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in a cookie for verification in the callback
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000, // 10 minutes
    sameSite: 'strict',
  });

  // Generate and redirect to Google OAuth URL
  const authUrl = generateAuthUrl(state);
  res.redirect(authUrl);
}

/**
 * Handle Google OAuth callback
 */
export async function googleCallback(req: Request, res: Response) {
  const { code, state } = req.query;
  const savedState = req.cookies?.oauth_state;

  // Redirect URL for after authentication
  const frontendUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://everypoll.com'
      : 'http://localhost:5173';

  // Validate state parameter to prevent CSRF attacks
  if (!state || !savedState || state !== savedState) {
    return res.redirect(`${frontendUrl}/login?error=invalid_state`);
  }

  // Clear the state cookie
  res.clearCookie('oauth_state');

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(code.toString());

    // Get user information from Google
    const googleUser = await getUserInfo(tokens.access_token);

    // Get repository for user operations
    const { userRepository } = getRepositories();

    // First, check if user exists by Google ID
    let user = googleUser.id
      ? userRepository.getByGoogleId(googleUser.id)
      : null;

    if (user) {
      // User already exists with this Google ID, update their info if needed
      user = userRepository.update(user.id, googleUser.email, googleUser.name);
    } else {
      // Check if there's a user with this email
      user = userRepository.getByEmail(googleUser.email);

      if (user) {
        // Link existing user with this Google account
        user = userRepository.update(
          user.id,
          googleUser.email,
          googleUser.name,
          googleUser.id
        );
      } else {
        // Create new user with Google profile information
        user = userRepository.create(
          googleUser.email,
          googleUser.name,
          googleUser.id
        );
      }
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

    // Redirect to frontend with success parameter
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
}
