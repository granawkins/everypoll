import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { getConnection } from './database';
import { SESSION_SECRET, NODE_ENV } from './auth/env';
import { configurePassport } from './auth/passportConfig';
import { authenticate } from './auth/middleware';
import authRoutes from './routes/authRoutes';

// Configure passport
configurePassport();

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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite's default port
  credentials: true, // Allow cookies to be sent with requests
}));
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from client/dist
app.use(express.static(CLIENT_DIST_PATH));

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the EveryPoll API!' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Apply authentication middleware to subsequent routes if needed
// app.use('/api/protected', authenticate({ requireAuth: true }), protectedRoutes);

// Serve React app for all other routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});
