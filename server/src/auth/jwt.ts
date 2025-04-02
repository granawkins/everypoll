/**
 * JWT token utilities for authentication
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRY } from './env';
import { User } from '../database';

/**
 * Generate a JWT token for a user
 * @param user The user to generate a token for
 * @returns The generated JWT token
 */
export function generateToken(user: User): string {
  // Create a payload with the user data
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  // Make sure JWT_SECRET is properly typed for jsonwebtoken
  const secret = JWT_SECRET as jwt.Secret;

  // Sign with proper options type
  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRY,
  });
}

/**
 * JWT payload interface
 */
export interface JwtPayload {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Verify a JWT token
 * @param token The token to verify
 * @returns The payload of the token if valid, null otherwise
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    // Ensure secret is properly typed
    const secret = JWT_SECRET as jwt.Secret;

    // Verify and cast as our payload type
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    // Token validation failed - no need to capture the error
    return null;
  }
}
