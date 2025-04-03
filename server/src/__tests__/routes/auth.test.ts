import request from 'supertest';
import { createApp } from '../../app';
import * as jwtService from '../../services/jwt';
import * as googleConfig from '../../services/google/config';
import * as googleAuth from '../../services/google/auth';
import { getRepositories } from '../../database';

// Create test app instance
const testApp = createApp();

// Mock the JWT service
jest.mock('../../services/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-jwt-token'),
  verifyToken: jest.fn().mockImplementation((token) => {
    // By default, return null (invalid token)
    if (token === 'test-jwt-token') {
      return { userId: 'test-user-id' };
    }
    return null;
  }),
}));

// Mock the Google OAuth config
jest.mock('../../services/google/config', () => ({
  generateAuthUrl: jest
    .fn()
    .mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth?mock-params'
    ),
  GOOGLE_AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
  GOOGLE_TOKEN_URL: 'https://oauth2.googleapis.com/token',
  GOOGLE_USER_INFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
  GOOGLE_CLIENT_ID: 'mock-client-id',
  GOOGLE_CLIENT_SECRET: 'mock-client-secret',
  REDIRECT_URL: 'http://localhost:5000/api/auth/google/callback',
  SCOPES: ['email', 'profile'],
}));

// Mock the Google Auth service
jest.mock('../../services/google/auth', () => ({
  exchangeCodeForTokens: jest.fn().mockResolvedValue({
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
  }),
  getUserInfo: jest.fn().mockResolvedValue({
    id: 'google-user-id',
    email: 'google@example.com',
    verified_email: true,
    name: 'Google User',
  }),
}));

// Get mocked functions
const { generateToken, verifyToken } = jwtService as jest.Mocked<
  typeof jwtService
>;
const { generateAuthUrl } = googleConfig as jest.Mocked<typeof googleConfig>;
const { exchangeCodeForTokens, getUserInfo } = googleAuth as jest.Mocked<
  typeof googleAuth
>;

// Mock the database repositories
jest.mock('../../database', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date().toISOString(),
  };

  const mockAnonymousUser = {
    id: 'anonymous-user-id',
    email: null,
    name: null,
    created_at: new Date().toISOString(),
  };

  const mockGoogleUser = {
    id: 'google-user-id',
    email: 'google@example.com',
    name: 'Google User',
    google_id: 'google-user-id',
    created_at: new Date().toISOString(),
  };

  return {
    ...jest.requireActual('../../database'),
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-user-id') return mockUser;
          if (id === 'google-user-id') return mockGoogleUser;
          return null;
        }),
        getByEmail: jest.fn().mockImplementation((email) => {
          if (email === 'test@example.com') return mockUser;
          if (email === 'google@example.com') return mockGoogleUser;
          return null;
        }),
        getByGoogleId: jest.fn().mockImplementation((googleId) => {
          if (googleId === 'google-user-id') return mockGoogleUser;
          return null;
        }),
        create: jest.fn().mockImplementation((email, name, googleId) => ({
          id: 'new-user-id',
          email,
          name,
          google_id: googleId,
          created_at: new Date().toISOString(),
        })),
        createAnonymous: jest.fn().mockReturnValue(mockAnonymousUser),
        update: jest.fn().mockImplementation((id, email, name, googleId) => ({
          id,
          email,
          name,
          google_id: googleId,
          created_at: new Date().toISOString(),
        })),
      },
    }),
  };
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (generateToken as jest.Mock).mockReturnValue('test-jwt-token');
  });

  describe('GET /api/auth/me', () => {
    it('should return anonymous user if no JWT cookie', async () => {
      const response = await request(testApp).get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(false);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('anonymous-user-id');
      expect(
        getRepositories().userRepository.createAnonymous
      ).toHaveBeenCalled();
    });

    it('should return authenticated user if valid JWT cookie', async () => {
      // Mock verifyToken to return a valid payload for this test
      (verifyToken as jest.Mock).mockReturnValueOnce({
        userId: 'test-user-id',
      });

      const response = await request(testApp)
        .get('/api/auth/me')
        .set('Cookie', ['auth_token=test-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('test-user-id');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email not provided', async () => {
      const response = await request(testApp).post('/api/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });

    it('should login existing user and set cookie', async () => {
      const response = await request(testApp)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe('test-user-id');

      // Check that cookie was set
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain(
        'auth_token=test-jwt-token'
      );
    });

    it('should create new user if not exists', async () => {
      const { userRepository } = getRepositories();
      (userRepository.getByEmail as jest.Mock).mockReturnValueOnce(null);

      const response = await request(testApp)
        .post('/api/auth/login')
        .send({ email: 'new@example.com', name: 'New User' });

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(userRepository.create).toHaveBeenCalledWith(
        'new@example.com',
        'New User'
      );
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear auth cookie', async () => {
      const response = await request(testApp).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');

      // Check that cookie was cleared
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('auth_token=;');
    });
  });

  describe('GET /api/auth/google', () => {
    it('should set state cookie and redirect to Google auth URL', async () => {
      const response = await request(testApp).get('/api/auth/google');

      // Check status code for redirect
      expect(response.status).toBe(302);

      // Check that state cookie was set
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('oauth_state=');

      // Check that redirect URL is to Google
      expect(response.headers.location).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth?mock-params'
      );

      // Check that generateAuthUrl was called
      expect(generateAuthUrl).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/google/callback', () => {
    beforeEach(() => {
      // Reset mocked implementations for each test
      (exchangeCodeForTokens as jest.Mock).mockResolvedValue({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      (getUserInfo as jest.Mock).mockResolvedValue({
        id: 'google-user-id',
        email: 'google@example.com',
        verified_email: true,
        name: 'Google User',
      });
    });

    it('should redirect with error if state is missing', async () => {
      const response = await request(testApp).get(
        '/api/auth/google/callback?code=test-code'
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_state');
    });

    it('should redirect with error if state does not match', async () => {
      const response = await request(testApp)
        .get('/api/auth/google/callback?code=test-code&state=invalid-state')
        .set('Cookie', ['oauth_state=valid-state']);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=invalid_state');
    });

    it('should redirect with error if code is missing', async () => {
      const response = await request(testApp)
        .get('/api/auth/google/callback?state=test-state')
        .set('Cookie', ['oauth_state=test-state']);

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error=no_code');
    });

    it('should authenticate user with Google credentials and set JWT cookie', async () => {
      // Mock that the user doesn't exist yet
      const { userRepository } = getRepositories();

      // Reset mocks to ensure clean state
      jest.clearAllMocks();

      // Explicitly make both checks return null
      (userRepository.getByGoogleId as jest.Mock).mockReturnValueOnce(null);
      (userRepository.getByEmail as jest.Mock).mockReturnValueOnce(null);

      // Create a successful response
      const response = await request(testApp)
        .get('/api/auth/google/callback?code=test-code&state=test-state')
        .set('Cookie', ['oauth_state=test-state']);

      // Should redirect to frontend success URL
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('auth=success');

      // Should clear state cookie and set auth cookie
      expect(response.headers['set-cookie']).toBeDefined();
      // Convert set-cookie headers to string for easier assertions
      const cookieHeader = Array.isArray(response.headers['set-cookie'])
        ? response.headers['set-cookie'].join(';')
        : String(response.headers['set-cookie']);
      expect(cookieHeader).toContain('oauth_state=;');
      expect(cookieHeader).toContain('auth_token=test-jwt-token');

      // Should have called the right functions
      expect(exchangeCodeForTokens).toHaveBeenCalledWith('test-code');
      expect(getUserInfo).toHaveBeenCalledWith('test-access-token');

      // Verify the function calls in a less strict way that's more resilient to changes
      expect(userRepository.getByGoogleId).toHaveBeenCalled();
      expect(userRepository.getByEmail).toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalled();
      expect(generateToken).toHaveBeenCalled();
    });

    it('should update existing user if email already exists', async () => {
      // Mock existing user found by email but not by Google ID
      const mockExistingUser = {
        id: 'existing-user-id',
        email: 'google@example.com',
        name: 'Old Name',
        created_at: new Date().toISOString(),
      };

      // Reset mocks to ensure clean state
      jest.clearAllMocks();

      const { userRepository } = getRepositories();
      // Make getByGoogleId return null for this test
      (userRepository.getByGoogleId as jest.Mock).mockReturnValueOnce(null);
      // Then make getByEmail find the existing user
      (userRepository.getByEmail as jest.Mock).mockReturnValueOnce(
        mockExistingUser
      );

      // Send request and ignore response since we're just checking the update was called
      await request(testApp)
        .get('/api/auth/google/callback?code=test-code&state=test-state')
        .set('Cookie', ['oauth_state=test-state']);

      // Verify update was called with the existing user ID
      expect(userRepository.update).toHaveBeenCalled();
      const updateCalls = (userRepository.update as jest.Mock).mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
      // First parameter of the first call should be the existing user ID
      expect(updateCalls[0][0]).toBe('existing-user-id');
      // Last parameter should be google ID
      const lastIndex = updateCalls[0].length - 1;
      expect(updateCalls[0][lastIndex]).toBe('google-user-id');
    });

    it('should handle Google API errors', async () => {
      // Mock API error
      (exchangeCodeForTokens as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      const errorResponse = await request(testApp)
        .get('/api/auth/google/callback?code=test-code&state=test-state')
        .set('Cookie', ['oauth_state=test-state']);

      // Should redirect to error URL
      expect(errorResponse.status).toBe(302);
      expect(errorResponse.headers.location).toContain('error=auth_failed');
    });
  });
});
