import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { getConnection } from './database';
import authRoutes from './routes/auth';
import pollsRoutes from './routes/polls';
import Database from 'better-sqlite3';

export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Database connection that can be used by the server
let dbConnection: Database.Database | null = null;

/**
 * Initialize the app with a database connection
 * @param db Optional existing database connection
 * @returns Express application
 */
export function createApp(db?: Database.Database): Application {
  const app = express();

  // Initialize database connection if not provided
  if (!db) {
    // Use environment variable to determine if we're in a test environment
    const isTest = process.env.NODE_ENV === 'test';
    db = getConnection(isTest);
  }

  // Store the database connection for server use
  dbConnection = db;

  // Gracefully close database on process exit
  process.on('exit', () => {
    if (dbConnection) {
      console.log('Closing database connection');
      dbConnection.close();
    }
  });

  // Also handle SIGINT and SIGTERM
  process.on('SIGINT', () => {
    if (dbConnection) {
      console.log('Received SIGINT, closing database');
      dbConnection.close();
    }
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (dbConnection) {
      console.log('Received SIGTERM, closing database');
      dbConnection.close();
    }
    process.exit(0);
  });

  // Middleware
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? 'https://everypoll.com'
          : 'http://localhost:5173',
      credentials: true, // Allow cookies
    })
  );
  app.use(express.json()); // Parse JSON bodies
  app.use(cookieParser()); // Parse cookies
  app.use(express.static(CLIENT_DIST_PATH)); // Serve static files from client/dist

  // API routes
  app.get('/api', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to the EveryPoll API!' });
  });

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Poll routes
  app.use('/api/polls', pollsRoutes);

  // Serve React app (must be last route)
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
  });

  return app;
}

// Create a default app instance for backward compatibility
export const app = createApp();
