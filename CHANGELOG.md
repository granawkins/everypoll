# Changelog

## PR 1: Database Setup

- Added SQLite (better-sqlite3) as the database
- Created database initialization that automatically builds the DB when not found
- Defined all required tables (Users, Polls, Answers, Votes) with appropriate constraints
- Implemented a migrations system for future schema changes
- Created a test setup that reinitializes the database between tests
- Implemented database repositories for Users, Polls, and Votes with comprehensive testing
- Added support for cross-referencing polls in the vote repository

## PR 2: Basic JWT Authentication

- Added minimal JWT authentication using jsonwebtoken package
- Implemented secure token storage with HTTP-only cookies
- Created JWT generation and validation services
- Added middleware for verifying authentication tokens
- Implemented anonymous user creation when no valid JWT is found
- Created authentication routes (/api/auth/me, /api/auth/login, /api/auth/logout)
- Added middleware for protecting routes that require authentication
- Included comprehensive tests for all authentication components
