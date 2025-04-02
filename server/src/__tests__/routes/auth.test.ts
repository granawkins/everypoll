import request from 'supertest';
import { app } from '../../app';
import * as jwtService from '../../services/jwt';
import { getRepositories } from '../../database';

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

// Get mocked functions
const { generateToken, verifyToken } = jwtService as jest.Mocked<
  typeof jwtService
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

  return {
    ...jest.requireActual('../../database'),
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-user-id') return mockUser;
          return null;
        }),
        getByEmail: jest.fn().mockImplementation((email) => {
          if (email === 'test@example.com') return mockUser;
          return null;
        }),
        create: jest.fn().mockReturnValue(mockUser),
        createAnonymous: jest.fn().mockReturnValue(mockAnonymousUser),
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
      const response = await request(app).get('/api/auth/me');

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

      const response = await request(app)
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
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email is required');
    });

    it('should login existing user and set cookie', async () => {
      const response = await request(app)
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

      const response = await request(app)
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
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');

      // Check that cookie was cleared
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('auth_token=;');
    });
  });
});
