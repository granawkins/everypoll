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
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify a JWT token
 * @param token The token to verify
 * @returns The payload of the token if valid, null otherwise
 */
export function verifyToken(
  token: string
): { id: string; email: string | null; name: string | null } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string | null;
      name: string | null;
    };
  } catch {
    // Token validation failed - no need to capture the error
    return null;
  }
}
