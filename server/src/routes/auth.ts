import express from 'express';
import { getCurrentUser, login, logout } from '../controllers/auth';
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
 * Simple login endpoint (will be replaced with Google OAuth in PR3)
 * Accepts email and name in request body
 * Creates user if doesn't exist
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Clears auth cookie
 */
router.post('/logout', logout);

export default router;
