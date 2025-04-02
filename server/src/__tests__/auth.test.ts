import request from 'supertest';
import express from 'express';
import { app } from '../app';
import { getRepositories } from '../database';
import { initializeTestDatabase } from '../database/connection';
import { generateToken } from '../auth/jwt';

// Mock passport authentication
jest.mock('passport', () => {
  return {
    authenticate: jest.fn(() => (req: any, res: any, next: any) => {
      // Just let all requests through for testing
      next();
    }),
    initialize: jest.fn(() => (req: any, res: any, next: any) => next()),
    session: jest.fn(() => (req: any, res: any, next: any) => next()),
    serializeUser: jest.fn((fn) => fn({}, () => {})),
    deserializeUser: jest.fn((fn) => fn('', () => {})),
    use: jest.fn() // Mock for passport.use method
  };
});

describe('Authentication Features', () => {
  beforeEach(() => {
    // Reset the database for each test
    initializeTestDatabase();
    
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  describe('User Authentication', () => {
    it('should return an anonymous user when not authenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('isAuthenticated', false);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBeNull();
      expect(response.body.user.name).toBeNull();
    });

    it('should create and retrieve users correctly', () => {
      const { userRepository } = getRepositories(true);
      
      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');
      
      // User should have correct properties
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user).toHaveProperty('name', 'Test User');
      
      // Retrieve user by ID
      const retrievedUser = userRepository.getById(user.id);
      expect(retrievedUser).toMatchObject(user);
      
      // Retrieve user by email
      const userByEmail = userRepository.getByEmail('test@example.com');
      expect(userByEmail).toMatchObject(user);
    });
    
    it('should generate valid JWT tokens', () => {
      const { userRepository } = getRepositories(true);
      
      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');
      
      // Generate a token
      const token = generateToken(user);
      
      // Token should be a non-empty string
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('Auth Flow', () => {
    it('should support anonymous users', () => {
      const { userRepository } = getRepositories(true);
      
      // Create an anonymous user
      const user = userRepository.createAnonymous();
      
      // User should have an ID but no email or name
      expect(user).toHaveProperty('id');
      expect(user.email).toBeNull();
      expect(user.name).toBeNull();
    });
    
    it('should update user information', () => {
      const { userRepository } = getRepositories(true);
      
      // Create a user
      const user = userRepository.create('test@example.com', 'Test User');
      
      // Update email
      const updatedEmailUser = userRepository.update(user.id, 'updated@example.com');
      expect(updatedEmailUser.email).toBe('updated@example.com');
      
      // Update name
      const updatedNameUser = userRepository.update(user.id, undefined, 'Updated Name');
      expect(updatedNameUser.name).toBe('Updated Name');
    });
  });
});
