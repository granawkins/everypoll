import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { getConnection } from './database';
import authRoutes from './routes/auth';
import pollsRoutes from './routes/polls';

export const app = express();
export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Initialize database connection
const db = getConnection();

// Gracefully close database on process exit
process.on('exit', () => {
  console.log('Closing database connection');
  db.close();
});

// Also handle SIGINT and SIGTERM
process.on('SIGINT', () => {
  console.log('Received SIGINT, closing database');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing database');
  db.close();
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
