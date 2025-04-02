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

  // Use the string literal type to help TypeScript
  // Handle the jwt.sign type constraints
  const secret = String(JWT_SECRET);

  // Specify a more precise type for the options object
  // to avoid using 'any' while still making TypeScript happy
  const options = { expiresIn: JWT_EXPIRY } as jwt.SignOptions;

  return jwt.sign(payload, secret, options);
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
    // Convert to string and bypass TypeScript strict checking
    const secret = String(JWT_SECRET);

    // Verify token and cast result to our payload type
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    // Token validation failed - no need to capture the error
    return null;
  }
}
