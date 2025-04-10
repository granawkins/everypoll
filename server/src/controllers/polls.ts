import { Request, Response } from 'express';
import { getRepositories } from '../database';

/**
 * Create a new poll
 * Requires authentication
 */
export function createPoll(req: Request, res: Response) {
  try {
    const { question, answers } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!userId) {
      res.status(500).json({ error: 'User ID not available' });
      return;
    }

    if (!question) {
      res.status(400).json({ error: 'Poll question is required' });
      return;
    }

    if (!answers || !Array.isArray(answers) || answers.length < 2) {
      res.status(400).json({ error: 'At least 2 answer options are required' });
      return;
    }

    if (answers.length > 10) {
      res.status(400).json({ error: 'Maximum 10 answer options allowed' });
      return;
    }

    // Create poll
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
    res.status(500).json({ error: 'Failed to create poll' });
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
      res.status(400).json({ error: 'Poll ID is required' });
      return;
    }

    const { pollRepository, userRepository, voteRepository } =
      getRepositories();

    // Get poll
    const poll = pollRepository.getById(id);

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Get answers
    const answers = pollRepository.getAnswers(id);

    // Get author
    const author = userRepository.getById(poll.author_id);

    // Get vote counts if available
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
    res.status(500).json({ error: 'Failed to retrieve poll' });
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
      res.status(500).json({ error: 'User ID not available' });
      return;
    }

    if (!pollId) {
      res.status(400).json({ error: 'Poll ID is required' });
      return;
    }

    if (!answerId) {
      res.status(400).json({ error: 'Answer ID is required' });
      return;
    }

    const { pollRepository, voteRepository } = getRepositories();

    // Check if poll exists
    const poll = pollRepository.getById(pollId);
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Check if answer belongs to the poll
    const answers = pollRepository.getAnswers(pollId);
    const answerExists = answers.some((answer) => answer.id === answerId);
    if (!answerExists) {
      res.status(400).json({ error: 'Invalid answer for this poll' });
      return;
    }

    try {
      // Record the vote
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
      // Handle case where user has already voted
      if (error instanceof Error && error.message.includes('already voted')) {
        res.status(400).json({ error: 'User has already voted on this poll' });
        return;
      }
      throw error; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
}
