import { Request, Response, NextFunction } from 'express';
import { getRepositories } from '../../database';

/**
 * Super simple handler for creating a poll
 * Copy-pasted from controller with no return values
 */
export function handleCreatePoll(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  try {
    if (!req.user) {
      res.status(500).json({ error: 'User not available' });
      return;
    }

    const { question, answers } = req.body;

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

    if (
      !answers.every((answer) => typeof answer === 'string' && answer.trim())
    ) {
      res.status(400).json({ error: 'All answers must be non-empty strings' });
      return;
    }

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
 * Super simple handler for getting a poll by ID
 * Copy-pasted from controller with no return values
 */
export function handleGetPollById(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Poll ID is required' });
      return;
    }

    const { pollRepository, userRepository } = getRepositories();
    const poll = pollRepository.getById(id);

    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    const answers = pollRepository.getAnswers(id);
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
