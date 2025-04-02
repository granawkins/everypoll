import express from 'express';
import {
  getCurrentUser,
  login,
  logout,
  googleLogin,
  googleCallback,
} from '../controllers/auth';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/auth/me
 * Returns the current user based on JWT in cookies
 * Creates anonymous user if no valid JWT is found
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/auth/login
 * Simple login endpoint for testing purposes
 * Accepts email and name in request body
 * Creates user if doesn't exist
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Clears auth cookie
 */
router.post('/logout', logout);

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth login page
 */
router.get('/google', googleLogin);

/**
 * GET /api/auth/google/callback
 * Handles callback from Google OAuth
 * Creates or updates user with Google profile info
 * Sets JWT in cookies and redirects to frontend
 */
router.get('/google/callback', googleCallback);

export default router;
