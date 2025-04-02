import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { getRepositories } from './database';

export const app = express();
export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Initialize database and repositories
const { userRepository, pollRepository, voteRepository, db } =
  getRepositories();

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
app.use(cors()); // Enable CORS for frontend communication
app.use(express.json()); // Parse JSON bodies
app.use(express.static(CLIENT_DIST_PATH)); // Serve static files from client/dist

// Basic route
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the EveryPoll API!' });
});

// Serve React app
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});
