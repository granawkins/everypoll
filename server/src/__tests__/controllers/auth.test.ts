import { Request, Response } from 'express';
import {
  getCurrentUser,
  login,
  logout,
  googleLogin,
  googleCallback,
} from '../../controllers/auth';
import { generateToken } from '../../services/jwt';
import { getRepositories, User } from '../../database';
import { generateAuthUrl } from '../../services/google/config';
import * as googleAuth from '../../services/google/auth';

// Mock the required modules
jest.mock('../../services/jwt');
jest.mock('../../services/google/config');
jest.mock('../../services/google/auth');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('random-state-string'),
  }),
}));

// Mock the database repositories
jest.mock('../../database', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date().toISOString(),
  };

  return {
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getByEmail: jest.fn().mockImplementation((email) => {
          if (email === 'test@example.com') return mockUser;
          if (email === 'new@example.com') return null;
          if (email === 'google@example.com') return null;
          return null;
        }),
        getByGoogleId: jest.fn().mockImplementation((_) => {
          // Return null by default (no user with this Google ID)
          return null;
        }),
        create: jest.fn().mockImplementation((email, name, googleId) => ({
          id: 'new-user-id',
          email,
          name,
          google_id: googleId,
          created_at: new Date().toISOString(),
        })),
        update: jest.fn().mockImplementation((id, email, name, googleId) => ({
          id,
          email,
          name,
          google_id: googleId,
          created_at: new Date().toISOString(),
        })),
      },
    }),
    User: jest.requireActual('../../database').User,
  };
});

describe('Auth Controllers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
    mockRequest = {
      body: {},
      query: {},
      cookies: {},
    };
    (generateToken as jest.Mock).mockReturnValue('mock-token');
    (generateAuthUrl as jest.Mock).mockReturnValue(
      'https://accounts.google.com/o/oauth2/auth?mock-url'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser controller', () => {
    it('should return user data and authentication status', () => {
      const user: User = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
      };

      mockRequest.user = user;
      mockRequest.isAuthenticated = true;

      getCurrentUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        user,
        isAuthenticated: true,
      });
    });

    it('should return error if user not available', () => {
      mockRequest.user = undefined;

      getCurrentUser(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not available',
      });
    });
  });

  describe('logout controller', () => {
    it('should clear the auth cookie', () => {
      logout(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('auth_token', {
        httpOnly: true,
        secure: false, // process.env.NODE_ENV !== 'production'
        sameSite: 'strict',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });
  });

  describe('login controller', () => {
    it('should return error if email not provided', () => {
      mockRequest.body = {};

      login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Email is required',
      });
    });

    it('should login existing user and set cookie', () => {
      mockRequest.body = { email: 'test@example.com' };

      login(mockRequest as Request, mockResponse as Response);

      expect(getRepositories().userRepository.getByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(generateToken).toHaveBeenCalledWith('test-user-id');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'mock-token',
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'test-user-id',
          email: 'test@example.com',
        }),
        isAuthenticated: true,
      });
    });

    it('should create new user if not exists', () => {
      mockRequest.body = { email: 'new@example.com', name: 'New User' };

      login(mockRequest as Request, mockResponse as Response);

      expect(getRepositories().userRepository.getByEmail).toHaveBeenCalledWith(
        'new@example.com'
      );
      expect(getRepositories().userRepository.create).toHaveBeenCalledWith(
        'new@example.com',
        'New User'
      );
      expect(generateToken).toHaveBeenCalledWith('new-user-id');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'mock-token',
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'new-user-id',
          email: 'new@example.com',
          name: 'New User',
        }),
        isAuthenticated: true,
      });
    });

    it('should use email prefix as name if name not provided', () => {
      mockRequest.body = { email: 'new@example.com' };

      login(mockRequest as Request, mockResponse as Response);

      expect(getRepositories().userRepository.create).toHaveBeenCalledWith(
        'new@example.com',
        'new'
      );
    });
  });

  describe('googleLogin controller', () => {
    it('should set state cookie and redirect to Google auth URL', () => {
      googleLogin(mockRequest as Request, mockResponse as Response);

      // Check that state cookie was set
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        'random-state-string',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 10 * 60 * 1000, // 10 minutes
        })
      );

      // Check that generateAuthUrl was called with state
      expect(generateAuthUrl).toHaveBeenCalledWith('random-state-string');

      // Check that response was redirected to Google
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/auth?mock-url'
      );
    });
  });

  describe('googleCallback controller', () => {
    beforeEach(() => {
      // Mock the Google API responses
      (googleAuth.exchangeCodeForTokens as jest.Mock).mockResolvedValue({
        access_token: 'test-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      });

      (googleAuth.getUserInfo as jest.Mock).mockResolvedValue({
        id: 'google-user-id',
        email: 'google@example.com',
        verified_email: true,
        name: 'Google User',
      });
    });

    it('should redirect with error if state is invalid', async () => {
      mockRequest.query = { state: 'invalid-state' };
      mockRequest.cookies = { oauth_state: 'saved-state' };

      await googleCallback(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/login?error=invalid_state'
      );
    });

    it('should redirect with error if code is missing', async () => {
      mockRequest.query = { state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      await googleCallback(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('oauth_state');
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/login?error=no_code'
      );
    });

    it('should create new user and set auth cookie for new Google user', async () => {
      mockRequest.query = { code: 'test-auth-code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      await googleCallback(mockRequest as Request, mockResponse as Response);

      // Check that state cookie was cleared
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('oauth_state');

      // Check that code was exchanged for tokens
      expect(googleAuth.exchangeCodeForTokens).toHaveBeenCalledWith(
        'test-auth-code'
      );

      // Check that user info was fetched
      expect(googleAuth.getUserInfo).toHaveBeenCalledWith('test-access-token');

      // Check that user repository methods were called
      // First checks by Google ID
      expect(
        getRepositories().userRepository.getByGoogleId
      ).toHaveBeenCalledWith('google-user-id');
      // Then checks by email
      expect(getRepositories().userRepository.getByEmail).toHaveBeenCalledWith(
        'google@example.com'
      );
      // Finally creates user with Google ID
      expect(getRepositories().userRepository.create).toHaveBeenCalledWith(
        'google@example.com',
        'Google User',
        'google-user-id'
      );

      // Check that JWT was generated and cookie set
      expect(generateToken).toHaveBeenCalledWith('new-user-id');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'mock-token',
        expect.any(Object)
      );

      // Check redirect to frontend
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:5173?auth=success'
      );
    });

    it('should update existing user and set auth cookie for returning Google user', async () => {
      // Setup existing user
      const { userRepository } = getRepositories();
      // First mock getByGoogleId to return null (no user found by Google ID)
      (userRepository.getByGoogleId as jest.Mock).mockReturnValueOnce(null);
      // Then mock getByEmail to return the existing user (found by email)
      (userRepository.getByEmail as jest.Mock).mockReturnValueOnce({
        id: 'existing-user-id',
        email: 'google@example.com',
        name: 'Old Name',
        created_at: new Date().toISOString(),
      });

      mockRequest.query = { code: 'test-auth-code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      await googleCallback(mockRequest as Request, mockResponse as Response);

      // Check that user was updated with Google ID
      expect(userRepository.update).toHaveBeenCalledWith(
        'existing-user-id',
        'google@example.com',
        'Google User',
        'google-user-id'
      );

      // Check that JWT was generated and cookie set
      expect(generateToken).toHaveBeenCalledWith('existing-user-id');
    });

    it('should handle Google API errors', async () => {
      // Mock API error
      (googleAuth.exchangeCodeForTokens as jest.Mock).mockRejectedValue(
        new Error('API error')
      );

      mockRequest.query = { code: 'test-auth-code', state: 'test-state' };
      mockRequest.cookies = { oauth_state: 'test-state' };

      await googleCallback(mockRequest as Request, mockResponse as Response);

      // Check redirect to error page
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/login?error=auth_failed'
      );
    });
  });
});
