import request from 'supertest';
import { app } from '../../app';
import { getRepositories } from '../../database';
import * as jwtService from '../../services/jwt';

// Mock JWT service
jest.mock('../../services/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('test-jwt-token'),
  verifyToken: jest.fn().mockImplementation((token) => {
    if (token === 'test-jwt-token') {
      return { userId: 'test-user-id' };
    }
    return null;
  }),
}));

describe('Poll Routes', () => {
  let testUserId: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a test user
    const { userRepository } = getRepositories(true);
    const user = userRepository.create('test@example.com', 'Test User');
    testUserId = user.id;

    // Mock verifyToken to return this user's ID
    (jwtService.verifyToken as jest.Mock).mockImplementation((token) => {
      if (token === 'test-jwt-token') {
        return { userId: testUserId };
      }
      return null;
    });
  });

  describe('POST /api/polls', () => {
    it('should create a new poll when authenticated', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green'],
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send(pollData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body.poll.question).toBe(pollData.question);
      expect(response.body.poll.author_id).toBe(testUserId);
      expect(response.body.answers).toHaveLength(pollData.answers.length);

      // Check that answer texts match what we sent
      const answerTexts = response.body.answers.map((a: any) => a.text);
      expect(answerTexts).toEqual(expect.arrayContaining(pollData.answers));
    });

    it('should reject poll creation when not authenticated', async () => {
      const pollData = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green'],
      };

      const response = await request(app).post('/api/polls').send(pollData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate poll has between 2-10 answers', async () => {
      // Test with too few answers
      const tooFewAnswers = {
        question: 'What is your favorite color?',
        answers: ['Red'], // Only one answer
      };

      const response1 = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send(tooFewAnswers);

      expect(response1.status).toBe(400);
      expect(response1.body.error).toContain(
        'Between 2 and 10 answer options are required'
      );

      // Test with too many answers
      const tooManyAnswers = {
        question: 'What is your favorite color?',
        answers: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], // 11 answers
      };

      const response2 = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send(tooManyAnswers);

      expect(response2.status).toBe(400);
      expect(response2.body.error).toContain(
        'Between 2 and 10 answer options are required'
      );
    });

    it('should validate question is provided', async () => {
      const noQuestion = {
        answers: ['Red', 'Blue', 'Green'],
      };

      const response = await request(app)
        .post('/api/polls')
        .set('Cookie', ['auth_token=test-jwt-token'])
        .send(noQuestion);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Question is required');
    });
  });

  describe('GET /api/polls/:id', () => {
    it('should get a poll by ID with answers and author info', async () => {
      // First create a poll
      const { pollRepository } = getRepositories(true);
      const { poll, answers } = pollRepository.create(
        testUserId,
        'Test question?',
        ['Answer 1', 'Answer 2']
      );

      // Then retrieve it
      const response = await request(app).get(`/api/polls/${poll.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('poll');
      expect(response.body).toHaveProperty('answers');
      expect(response.body).toHaveProperty('author');

      expect(response.body.poll.id).toBe(poll.id);
      expect(response.body.poll.question).toBe('Test question?');
      expect(response.body.answers).toHaveLength(2);
      expect(response.body.author).toHaveProperty('id', testUserId);
      expect(response.body.author).toHaveProperty('name', 'Test User');
    });

    it('should return 404 if poll not found', async () => {
      const response = await request(app).get('/api/polls/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Poll not found');
    });
  });
});
