import { Request, Response } from 'express';
import { createPoll, getPollById } from '../../controllers/polls';
import { getRepositories, User } from '../../database';

// Mock the database repositories
jest.mock('../../database', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date().toISOString(),
  };

  // Create test data
  const mockPoll = {
    id: 'test-poll-id',
    author_id: 'test-user-id',
    question: 'Test Question?',
    created_at: new Date().toISOString(),
  };

  const mockAnswers = [
    { id: 'answer-1', poll_id: 'test-poll-id', text: 'Answer 1' },
    { id: 'answer-2', poll_id: 'test-poll-id', text: 'Answer 2' },
  ];

  return {
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-user-id') return mockUser;
          return null;
        }),
      },
      pollRepository: {
        create: jest.fn().mockImplementation((authorId, question, answers) => ({
          poll: { ...mockPoll, author_id: authorId, question },
          answers: answers.map((text, i) => ({
            id: `answer-${i + 1}`,
            poll_id: 'test-poll-id',
            text,
          })),
        })),
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-poll-id') return mockPoll;
          return null;
        }),
        getAnswers: jest.fn().mockReturnValue(mockAnswers),
      },
    }),
    User: jest.requireActual('../../database').User,
  };
});

describe('Poll Controllers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      body: {},
      params: {},
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPoll controller', () => {
    it('should create a poll with valid input', () => {
      mockRequest.body = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green'],
      };

      createPoll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          poll: expect.objectContaining({
            question: 'What is your favorite color?',
          }),
          answers: expect.arrayContaining([
            expect.objectContaining({ text: 'Red' }),
            expect.objectContaining({ text: 'Blue' }),
            expect.objectContaining({ text: 'Green' }),
          ]),
        })
      );
    });

    it('should return 400 if question is missing', () => {
      mockRequest.body = {
        answers: ['Red', 'Blue', 'Green'],
      };

      createPoll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Question is required',
      });
    });

    it('should return 400 if answers array is invalid', () => {
      mockRequest.body = {
        question: 'What is your favorite color?',
        answers: ['Red'], // Too few answers
      };

      createPoll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Between 2 and 10 answer options are required',
      });
    });

    it('should return 400 if answers are not all strings', () => {
      mockRequest.body = {
        question: 'What is your favorite color?',
        answers: ['Red', '', null], // Empty string and null not allowed
      };

      createPoll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'All answers must be non-empty strings',
      });
    });

    it('should return 500 if user is not available', () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        question: 'What is your favorite color?',
        answers: ['Red', 'Blue', 'Green'],
      };

      createPoll(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User not available',
      });
    });
  });

  describe('getPollById controller', () => {
    it('should get a poll by ID with answers and author', () => {
      mockRequest.params = { id: 'test-poll-id' };

      getPollById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          poll: expect.objectContaining({
            id: 'test-poll-id',
            question: 'Test Question?',
          }),
          answers: expect.arrayContaining([
            expect.objectContaining({ text: 'Answer 1' }),
            expect.objectContaining({ text: 'Answer 2' }),
          ]),
          author: expect.objectContaining({
            id: 'test-user-id',
            name: 'Test User',
          }),
        })
      );
    });

    it('should return 404 if poll not found', () => {
      mockRequest.params = { id: 'non-existent-id' };

      getPollById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Poll not found',
      });
    });

    it('should return 400 if poll ID is not provided', () => {
      mockRequest.params = {};

      getPollById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Poll ID is required',
      });
    });
  });
});
