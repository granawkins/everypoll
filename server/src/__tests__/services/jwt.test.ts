import { generateToken, verifyToken } from '../../services/jwt';

describe('JWT Service', () => {
  it('should generate and verify a valid token', () => {
    const userId = '123abc';

    // Generate a token
    const token = generateToken(userId);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // Verify the token
    const decodedPayload = verifyToken(token);
    expect(decodedPayload).not.toBeNull();
    expect(decodedPayload?.userId).toBe(userId);
  });

  it('should return null for an invalid token', () => {
    const invalidToken = 'invalid.token.string';
    const result = verifyToken(invalidToken);
    expect(result).toBeNull();
  });

  it('should return null for a tampered token', () => {
    const userId = '123abc';
    const token = generateToken(userId);

    // Tamper with the token by changing one character
    const tamperedToken = token.substring(0, token.length - 1) + 'X';

    const result = verifyToken(tamperedToken);
    expect(result).toBeNull();
  });
});
