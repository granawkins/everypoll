import { User } from '../database';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated?: boolean;
    }
  }
}
