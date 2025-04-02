import { Request, Response } from 'express';
import { getCurrentUser, login, logout } from '../../controllers/auth';
import { generateToken } from '../../services/jwt';
import { getRepositories, User } from '../../database';

// Mock the JWT service
jest.mock('../../services/jwt');

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
          return null;
        }),
        create: jest.fn().mockImplementation((email, name) => ({
          id: 'new-user-id',
          email,
          name,
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
    };
    mockRequest = {
      body: {},
    };
    (generateToken as jest.Mock).mockReturnValue('mock-token');
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
});
