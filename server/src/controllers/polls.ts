import { Request, Response, NextFunction } from 'express';
import { getRepositories } from '../database';

/**
 * Create a new poll
 * @param req Request with poll data in body
 * @param res Response
 * @param next Next function
 */
export function createPoll(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (!req.user) {
    res.status(500).json({ error: 'User not available' });
    return;
  }

  const { question, answers } = req.body;

  // Validate input
  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  if (
    !answers ||
    !Array.isArray(answers) ||
    answers.length < 2 ||
    answers.length > 10
  ) {
    res
      .status(400)
      .json({ error: 'Between 2 and 10 answer options are required' });
    return;
  }

  // Ensure all answers are strings
  if (!answers.every((answer) => typeof answer === 'string' && answer.trim())) {
    res.status(400).json({ error: 'All answers must be non-empty strings' });
    return;
  }

  try {
    const { pollRepository } = getRepositories();
    const { poll, answers: createdAnswers } = pollRepository.create(
      req.user.id,
      question,
      answers
    );

    res.status(201).json({
      poll,
      answers: createdAnswers,
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
}

/**
 * Get a poll by ID with answers and author information
 * @param req Request with poll ID in params
 * @param res Response
 * @param next Next function
 */
export function getPollById(
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: 'Poll ID is required' });
    return;
  }

  try {
    const { pollRepository, userRepository } = getRepositories();
    const poll = pollRepository.getById(id);

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Get poll answers
    const answers = pollRepository.getAnswers(id);

    // Get poll author (excluding sensitive info)
    const author = userRepository.getById(poll.author_id);
    const authorInfo = author
      ? {
          id: author.id,
          name: author.name,
        }
      : null;

    res.json({
      poll,
      answers,
      author: authorInfo,
    });
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
}
