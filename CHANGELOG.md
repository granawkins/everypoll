# Changelog

## PR 1: Database Setup

- Added SQLite (better-sqlite3) as the database
- Created database initialization that automatically builds the DB when not found
- Defined all required tables (Users, Polls, Answers, Votes) with appropriate constraints
- Implemented a migrations system for future schema changes
- Created a test setup that reinitializes the database between tests
- Implemented database repositories for Users, Polls, and Votes with comprehensive testing
- Added support for cross-referencing polls in the vote repository

## PR 2: Authentication System

- Added user authentication with Google OAuth via Passport.js
- Implemented session management with express-session
- Created JWT token generation and verification for API authentication
- Set up anonymous user creation for non-authenticated sessions
- Implemented middleware for protected routes
- Added authentication routes (/api/auth/me, /api/auth/login, /api/auth/google-callback, /api/auth/logout)
- Created comprehensive tests for the authentication system
- Set up environment variable configuration for auth settings
