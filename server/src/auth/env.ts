/**
 * Load and validate environment variables
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment variables
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || '5000';

// Session
export const SESSION_SECRET =
  process.env.SESSION_SECRET || 'dev_session_secret';

// Google OAuth
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  'http://localhost:5000/api/auth/google-callback';

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// Validate required environment variables in production
if (NODE_ENV === 'production') {
  const requiredEnvVars = [
    'SESSION_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
  }
}
