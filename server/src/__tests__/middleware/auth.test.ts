import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAuth } from '../../middleware/auth';
import { verifyToken } from '../../services/jwt';
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

  const mockAnonymousUser: User = {
    id: 'anonymous-user-id',
    email: null,
    name: null,
    created_at: new Date().toISOString(),
  };

  return {
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-user-id') return mockUser;
          return null;
        }),
        createAnonymous: jest.fn().mockReturnValue(mockAnonymousUser),
      },
    }),
    User: jest.requireActual('../../database').User,
  };
});

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should create anonymous user if no token provided', () => {
      // Call the middleware
      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Check if createAnonymous was called
      expect(
        getRepositories().userRepository.createAnonymous
      ).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should authenticate user with valid token', () => {
      // Setup valid token
      mockRequest.cookies = { auth_token: 'valid-token' };
      (verifyToken as jest.Mock).mockReturnValueOnce({
        userId: 'test-user-id',
      });

      // Call the middleware
      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify token was checked and user was fetched
      expect(verifyToken).toHaveBeenCalledWith('valid-token');
      expect(getRepositories().userRepository.getById).toHaveBeenCalledWith(
        'test-user-id'
      );

      // Check request properties were set
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('test-user-id');
      expect(mockRequest.isAuthenticated).toBe(true);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should create anonymous user if token is invalid', () => {
      // Setup invalid token
      mockRequest.cookies = { auth_token: 'invalid-token' };
      (verifyToken as jest.Mock).mockReturnValueOnce(null);

      // Call the middleware
      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Check anonymous user was created
      expect(
        getRepositories().userRepository.createAnonymous
      ).toHaveBeenCalled();
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should create anonymous user if user not found', () => {
      // Setup token for non-existent user
      mockRequest.cookies = { auth_token: 'valid-token' };
      (verifyToken as jest.Mock).mockReturnValueOnce({
        userId: 'non-existent-id',
      });

      // Call the middleware
      authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Check anonymous user was created
      expect(
        getRepositories().userRepository.createAnonymous
      ).toHaveBeenCalled();
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    it('should allow authenticated requests', () => {
      // Setup authenticated request
      mockRequest.isAuthenticated = true;

      // Call the middleware
      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should proceed to next middleware
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block unauthenticated requests with 401', () => {
      // Setup unauthenticated request
      mockRequest.isAuthenticated = false;

      // Call the middleware
      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Should return 401
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
