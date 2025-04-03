/* global describe, it, beforeAll, afterAll, beforeEach, expect, jest */
import request from 'supertest';
import { app } from '../../../app';
import {
  getRepositories,
  initializeTestDatabase,
  closeAllConnections,
  DbConnectionType,
} from '../../../database';
import * as jwtService from '../../../services/jwt';

// Mock the JWT service
jest.mock('../../../services/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-jwt-token'),
  verifyToken: jest.fn().mockImplementation((token) => {
    if (token === 'test-jwt-token') {
      return { userId: 'test-user-id' };
    }
    return null;
  }),
}));

// Mock the database with real in-memory database
jest.mock('../../../database', () => {
  // Use actual implementations but with in-memory database
  const originalModule = jest.requireActual('../../../database');

  // Return the original module with modified getRepositories
  return {
    ...originalModule,
    getRepositories: jest.fn().mockImplementation((options) => {
      // Always use in-memory database for tests
      const newOptions =
        typeof options === 'boolean'
          ? { connectionType: originalModule.DbConnectionType.TestInMemory }
          : {
              ...options,
              connectionType: originalModule.DbConnectionType.TestInMemory,
            };

      return originalModule.getRepositories(newOptions);
    }),
  };
});

describe('Poll Routes Integration', () => {
  // Set up the test database before tests
  beforeAll(() => {
    initializeTestDatabase(DbConnectionType.TestInMemory);
  });

  // Close connections after all tests
  afterAll(() => {
    closeAllConnections();
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Create a test user for each test
  let testUserId;

  beforeEach(() => {
    const { userRepository } = getRepositories();
    const user = userRepository.create('test@example.com', 'Test User');
    testUserId = user.id;

    // Make JWT verification return this user's ID
    jwtService.verifyToken.mockImplementation((token) => {
      if (token === 'test-jwt-token') {
        return { userId: testUserId };
      }
      return null;
    });
  });

  describe('POST /api/polls', () => {
    it('should require authentication', async () => {
      // Send request without auth token
      const response = await request(app)
        .post('/api/polls')
        .send({
          question: 'Test poll?',
          answers: ['Option 1', 'Option 2'],
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should create a poll with valid data', async () => {
      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          question: 'Test poll?',
          answers: ['Option 1', 'Option 2'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body).toHaveProperty('author');
      expect(response.body.poll.question).toBe('Test poll?');
      expect(response.body.answers).toHaveLength(2);
      expect(response.body.author.id).toBe(testUserId);

      // Save poll ID for later tests
      const pollId = response.body.poll.id;

      // Verify poll exists in database
      const { pollRepository } = getRepositories();
      const retrievedPoll = pollRepository.getById(pollId);
      expect(retrievedPoll).not.toBeNull();
      expect(retrievedPoll.question).toBe('Test poll?');
    });

    it('should validate minimum answer options', async () => {
      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          question: 'Test poll?',
          answers: ['Only one option'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'At least 2 answer options are required'
      );
    });
  });

  describe('GET /api/polls/:id and POST /api/polls/:id/vote', () => {
    let pollId;
    let answerIds;

    beforeEach(async () => {
      // Create a poll for testing
      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          question: 'Test poll for votes?',
          answers: ['Answer 1', 'Answer 2', 'Answer 3'],
        });

      pollId = response.body.poll.id;
      answerIds = response.body.answers.map((a) => a.id);
    });

    it('should return poll details', async () => {
      const response = await request(app)
        .get(`/api/polls/${pollId}`)
        .set('Cookie', ['auth_token=test-jwt-token']);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body).toHaveProperty('author');
      expect(response.body).toHaveProperty('votes');

      expect(response.body.poll.id).toBe(pollId);
      expect(response.body.answers).toHaveLength(3);
      expect(response.body.author.id).toBe(testUserId);
      expect(response.body.votes.total).toBe(0);
      expect(response.body.hasVoted).toBe(false);
      expect(response.body.userVote).toBeNull();
    });

    it('should allow voting and update poll details', async () => {
      // First vote on the poll
      const voteResponse = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          answerId: answerIds[1], // Vote for the second answer
        });

      expect(voteResponse.status).toBe(201);
      expect(voteResponse.body).toHaveProperty('vote');
      expect(voteResponse.body).toHaveProperty('votes');
      expect(voteResponse.body.vote.answer_id).toBe(answerIds[1]);
      expect(voteResponse.body.votes.total).toBe(1);

      // Then check the poll details show the vote
      const pollResponse = await request(app)
        .get(`/api/polls/${pollId}`)
        .set('Cookie', ['auth_token=test-jwt-token']);

      expect(pollResponse.body.votes.total).toBe(1);
      expect(pollResponse.body.hasVoted).toBe(true);
      expect(pollResponse.body.userVote).toBe(answerIds[1]);
      expect(pollResponse.body.votes.byAnswer[answerIds[1]]).toBe(1);
    });

    it('should prevent voting twice', async () => {
      // First vote
      await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          answerId: answerIds[0],
        });

      // Try to vote again
      const secondVoteResponse = await request(app)
        .post(`/api/polls/${pollId}/vote`)
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send({
          answerId: answerIds[1],
        });

      expect(secondVoteResponse.status).toBe(400);
      expect(secondVoteResponse.body.error).toBe(
        'User has already voted on this poll'
      );
    });
  });
});
