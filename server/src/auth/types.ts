/**
 * Type definitions for authentication
 */
import { User } from '../database';

// Extend Express.Session interface to add our custom properties
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

// JWT payload type
export interface JwtPayload {
  id: string;
  email: string | null;
  name: string | null;
}

// Auth response type
export interface AuthResponse {
  user: User;
  isAuthenticated: boolean;
  token?: string;
}
