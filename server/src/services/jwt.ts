import jwt from 'jsonwebtoken';

// Secret key for signing JWTs
// In a real production app, this would be stored in an environment variable
const JWT_SECRET = 'everypoll-jwt-secret';
const JWT_EXPIRES_IN = '7d'; // Tokens expire in 7 days

/**
 * Generate a JWT for a user
 * @param userId The ID of the user
 * @returns JWT string
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT
 * @param token JWT string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (_) {
    // Return null for any verification error
    return null;
  }
}
