import { Request, Response } from 'express';
import { getPollById } from '../../controllers/polls';
import { getRepositories } from '../../database';
import { parse } from 'qs';

// Mock the database repositories
jest.mock('../../database', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    created_at: new Date().toISOString(),
  };

  const mockPoll = {
    id: 'test-poll-id',
    author_id: 'test-user-id',
    question: 'Test question?',
    created_at: new Date().toISOString(),
  };

  const mockReferencePoll1 = {
    id: 'reference-poll-1',
    author_id: 'test-user-id',
    question: 'Reference question 1?',
    created_at: new Date().toISOString(),
  };

  const mockReferencePoll2 = {
    id: 'reference-poll-2',
    author_id: 'test-user-id',
    question: 'Reference question 2?',
    created_at: new Date().toISOString(),
  };

  // Basic answers for most tests
  const mockAnswers = [
    { id: 'answer1', poll_id: 'test-poll-id', text: 'Answer 1' },
    { id: 'answer2', poll_id: 'test-poll-id', text: 'Answer 2' },
  ];

  const mockReferenceAnswers1 = [
    { id: 'ref1-answer1', poll_id: 'reference-poll-1', text: 'Ref1 Answer 1' },
    { id: 'ref1-answer2', poll_id: 'reference-poll-1', text: 'Ref1 Answer 2' },
  ];

  const mockReferenceAnswers2 = [
    { id: 'ref2-answer1', poll_id: 'reference-poll-2', text: 'Ref2 Answer 1' },
    { id: 'ref2-answer2', poll_id: 'reference-poll-2', text: 'Ref2 Answer 2' },
  ];

  return {
    getRepositories: jest.fn().mockReturnValue({
      userRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-user-id') return mockUser;
          return { ...mockUser, id, name: `User ${id}` };
        }),
      },
      pollRepository: {
        getById: jest.fn().mockImplementation((id) => {
          if (id === 'test-poll-id') return mockPoll;
          if (id === 'reference-poll-1') return mockReferencePoll1;
          if (id === 'reference-poll-2') return mockReferencePoll2;
          if (id === 'non-existent-poll') return null;
          return { ...mockPoll, id, question: `Question for ${id}?` };
        }),
        getAnswers: jest.fn().mockImplementation((id) => {
          if (id === 'test-poll-id') return mockAnswers;
          if (id === 'reference-poll-1') return mockReferenceAnswers1;
          if (id === 'reference-poll-2') return mockReferenceAnswers2;
          return [];
        }),
      },
      voteRepository: {
        countVotesByAnswer: jest.fn().mockReturnValue({
          answer1: 3,
          answer2: 2,
        }),
        countTotalVotes: jest.fn().mockReturnValue(5),
        hasVoted: jest.fn().mockReturnValue(false),
        getUserVote: jest.fn().mockReturnValue(null),
        getCrossReferencedVotes: jest
          .fn()
          .mockImplementation(
            (targetPollId, referencePollId, referenceAnswerId) => {
              // Different results based on the reference answer
              if (referencePollId === 'reference-poll-1') {
                if (referenceAnswerId === 'ref1-answer1') {
                  return { answer1: 2, answer2: 1 };
                } else if (referenceAnswerId === 'ref1-answer2') {
                  return { answer1: 1, answer2: 1 };
                } else {
                  return { answer1: 3, answer2: 2 };
                }
              } else if (referencePollId === 'reference-poll-2') {
                if (referenceAnswerId === 'ref2-answer1') {
                  return { answer1: 1, answer2: 0 };
                } else if (referenceAnswerId === 'ref2-answer2') {
                  return { answer1: 0, answer2: 1 };
                } else {
                  return { answer1: 1, answer2: 1 };
                }
              }
              return {};
            }
          ),
      },
    }),
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
      params: { id: 'test-poll-id' },
      query: {},
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    };
    jest.clearAllMocks();
  });

  describe('getPollById controller', () => {
    it('should return poll data with empty cross-references when no query params', () => {
      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Check that response was called with poll data
      expect(mockResponse.json).toHaveBeenCalled();

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check basic poll data
      expect(responseData).toHaveProperty('poll');
      expect(responseData).toHaveProperty('answers');
      expect(responseData).toHaveProperty('author');
      expect(responseData).toHaveProperty('votes');

      // Check cross-references are included but empty
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toEqual([]);
    });

    it('should include cross-referenced data when query params are provided', () => {
      // Set up query parameters for cross-reference
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=reference-poll-1&a1=ref1-answer1');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-references are included
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toHaveLength(1);

      // Check cross-reference data structure
      const crossRef = responseData.crossReferences[0];
      expect(crossRef).toHaveProperty('poll');
      expect(crossRef).toHaveProperty('answers');
      expect(crossRef).toHaveProperty('selectedAnswer');
      expect(crossRef).toHaveProperty('author');
      expect(crossRef).toHaveProperty('votes');

      // Check specific cross-reference data
      expect(crossRef.poll.id).toBe('reference-poll-1');
      expect(crossRef.selectedAnswer.id).toBe('ref1-answer1');
      expect(crossRef.votes.byAnswer).toEqual({ answer1: 2, answer2: 1 });
    });

    it('should support multiple cross-references', () => {
      // Set up query parameters for multiple cross-references
      // Parse the query string the same way Express would
      mockRequest.query = parse(
        'p1=reference-poll-1&a1=ref1-answer1&p2=reference-poll-2&a2=ref2-answer2'
      );

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check both cross-references are included
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toHaveLength(2);

      // Check first cross-reference
      expect(responseData.crossReferences[0].poll.id).toBe('reference-poll-1');
      expect(responseData.crossReferences[0].selectedAnswer.id).toBe(
        'ref1-answer1'
      );

      // Check second cross-reference
      expect(responseData.crossReferences[1].poll.id).toBe('reference-poll-2');
      expect(responseData.crossReferences[1].selectedAnswer.id).toBe(
        'ref2-answer2'
      );
    });

    it('should handle cross-references without answer IDs', () => {
      // Set up query parameters without answer ID
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=reference-poll-1');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-reference is included
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toHaveLength(1);

      // Check cross-reference data
      const crossRef = responseData.crossReferences[0];
      expect(crossRef.poll.id).toBe('reference-poll-1');
      expect(crossRef.selectedAnswer).toBeNull();
      expect(crossRef.votes.byAnswer).toEqual({ answer1: 3, answer2: 2 });
    });

    it('should skip invalid poll references', () => {
      // Set up query parameters with non-existent poll
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=non-existent-poll');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-references are empty (non-existent poll was skipped)
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toEqual([]);
    });

    it('should skip invalid answer references', () => {
      // Set up query parameters with invalid answer ID
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=reference-poll-1&a1=invalid-answer-id');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-references are empty (invalid answer was skipped)
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toEqual([]);
    });

    it('should handle errors gracefully', () => {
      // Mock repository to throw an error
      const { voteRepository } = getRepositories();
      (
        voteRepository.getCrossReferencedVotes as jest.Mock
      ).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      // Set up query parameters
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=reference-poll-1&a1=ref1-answer1');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-references are empty (error was handled)
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toEqual([]);
    });

    it('should deduplicate cross-references with the same poll ID', () => {
      // Set up query parameters with duplicate poll IDs
      // Parse the query string the same way Express would
      mockRequest.query = parse(
        'p1=reference-poll-1&a1=ref1-answer1&p2=reference-poll-1&a2=ref1-answer2'
      );

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check only one cross-reference was included (first one wins)
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toHaveLength(1);
      expect(responseData.crossReferences[0].poll.id).toBe('reference-poll-1');
      expect(responseData.crossReferences[0].selectedAnswer.id).toBe(
        'ref1-answer1'
      );
    });

    it('should handle self-references gracefully', () => {
      // Set up query parameters with self-reference
      // Parse the query string the same way Express would
      mockRequest.query = parse('p1=test-poll-id&a1=answer1');

      // Call the controller function
      getPollById(mockRequest as Request, mockResponse as Response);

      // Extract the actual response data
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0];

      // Check cross-references are empty (self-reference was skipped)
      expect(responseData).toHaveProperty('crossReferences');
      expect(responseData.crossReferences).toEqual([]);
    });
  });
});
