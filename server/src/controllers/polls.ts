import { Request, Response } from 'express';
import { getRepositories } from '../database';
import {
  ValidationError,
  PollAnswerCountError,
  PollNotFoundError,
  InvalidAnswerError,
  AlreadyVotedError,
  AuthenticationError,
} from '../errors';

/**
 * Create a new poll
 * Requires authentication
 */
export function createPoll(req: Request, res: Response) {
  try {
    const { question, answers } = req.body;
    const userId = req.user?.id;

    // Validate user authentication
    if (!userId) {
      throw new AuthenticationError('User ID not available');
    }

    // Validate required fields
    if (!question) {
      throw new ValidationError('Poll question is required');
    }

    if (!answers || !Array.isArray(answers)) {
      throw new ValidationError('Answer options must be an array');
    }

    // Create poll (PollAnswerCountError may be thrown from repository)
    const { pollRepository, userRepository } = getRepositories();
    const { poll, answers: createdAnswers } = pollRepository.create(
      userId,
      question,
      answers
    );

    // Get author information
    const author = userRepository.getById(poll.author_id);

    // Return successful response
    res.status(201).json({
      poll,
      answers: createdAnswers,
      author: {
        id: author.id,
        name: author.name,
      },
    });
  } catch (error) {
    console.error('Error creating poll:', error);

    // Map error types to appropriate HTTP status codes
    if (error instanceof AuthenticationError) {
      res.status(500).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof PollAnswerCountError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create poll' });
    }
  }
}

/**
 * Get a poll by ID
 * Includes answers, author info, and vote counts if available
 */
export function getPollById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ValidationError('Poll ID is required');
    }

    const { pollRepository, userRepository, voteRepository } =
      getRepositories();

    // Get poll - will throw PollNotFoundError if not found
    const poll = pollRepository.getById(id);

    // Get answers
    const answers = pollRepository.getAnswers(id);

    // Get author
    const author = userRepository.getById(poll.author_id);

    // Get vote counts
    const voteCounts = voteRepository.countVotesByAnswer(id);
    const totalVotes = voteRepository.countTotalVotes(id);

    // Check if user has voted
    const hasVoted = req.user
      ? voteRepository.hasVoted(req.user.id, id)
      : false;

    // Get user's vote if they've voted
    let userVote = null;
    if (hasVoted && req.user) {
      userVote = voteRepository.getUserVote(req.user.id, id);
    }

    // Return poll data
    res.json({
      poll,
      answers,
      author: {
        id: author.id,
        name: author.name,
      },
      votes: {
        total: totalVotes,
        byAnswer: voteCounts,
      },
      userVote: userVote ? userVote.answer_id : null,
      hasVoted,
    });
  } catch (error) {
    console.error('Error getting poll:', error);

    // Map error types to appropriate HTTP status codes
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof PollNotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve poll' });
    }
  }
}

/**
 * Vote on a poll
 * Requires authentication
 */
export function voteOnPoll(req: Request, res: Response) {
  try {
    const { id: pollId } = req.params;
    const { answerId } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!userId) {
      throw new AuthenticationError('User ID not available');
    }

    if (!pollId) {
      throw new ValidationError('Poll ID is required');
    }

    if (!answerId) {
      throw new ValidationError('Answer ID is required');
    }

    const { pollRepository, voteRepository } = getRepositories();

    // This will throw PollNotFoundError if poll doesn't exist
    pollRepository.getById(pollId);

    // Check if answer belongs to the poll
    const answers = pollRepository.getAnswers(pollId);
    const answerExists = answers.some((answer) => answer.id === answerId);
    if (!answerExists) {
      throw new InvalidAnswerError('Invalid answer for this poll');
    }

    // Record the vote - may throw AlreadyVotedError
    const vote = voteRepository.create(userId, pollId, answerId);

    // Get updated vote counts
    const voteCounts = voteRepository.countVotesByAnswer(pollId);
    const totalVotes = voteRepository.countTotalVotes(pollId);

    // Return successful response
    res.status(201).json({
      vote,
      votes: {
        total: totalVotes,
        byAnswer: voteCounts,
      },
    });
  } catch (error) {
    console.error('Error voting on poll:', error);

    // Map error types to appropriate HTTP status codes
    if (error instanceof AuthenticationError) {
      res.status(500).json({ error: error.message });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof PollNotFoundError) {
      res.status(404).json({ error: error.message });
    } else if (error instanceof InvalidAnswerError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof AlreadyVotedError) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to record vote' });
    }
  }
}
