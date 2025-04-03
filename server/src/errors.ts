/**
 * Custom error classes for EveryPoll application
 */

/**
 * Base class for application-specific errors
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {}

/**
 * Poll-related errors
 */
export class PollError extends AppError {}
export class PollAnswerCountError extends PollError {}
export class PollNotFoundError extends PollError {}
export class InvalidAnswerError extends PollError {}

/**
 * Vote-related errors
 */
export class VoteError extends AppError {}
export class AlreadyVotedError extends VoteError {}

/**
 * User-related errors
 */
export class UserError extends AppError {}
export class UserNotFoundError extends UserError {}
export class AuthenticationError extends UserError {}
