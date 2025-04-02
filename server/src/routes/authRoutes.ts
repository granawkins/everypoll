/**
 * Authentication routes
 */
import express from 'express';
import {
  getCurrentUser,
  googleLogin,
  googleCallback,
  logout,
} from '../auth/controllers';
import { authenticate } from '../auth/middleware';

const router = express.Router();

/**
 * @route   GET /api/auth/me
 * @desc    Get current user or create anonymous user
 * @access  Public
 */
router.get('/me', authenticate() as RequestHandler, getCurrentUser);

/**
 * @route   GET /api/auth/login
 * @desc    Initiate Google OAuth login
 * @access  Public
 */
router.get('/login', googleLogin);

/**
 * @route   GET /api/auth/google-callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google-callback', googleCallback);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', logout);

export default router;
