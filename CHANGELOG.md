# Changelog

## PR 1: Database Setup

- Added SQLite (better-sqlite3) as the database
- Created database initialization that automatically builds the DB when not found
- Defined all required tables (Users, Polls, Answers, Votes) with appropriate constraints
- Implemented a migrations system for future schema changes
- Created a test setup that reinitializes the database between tests
- Implemented database repositories for Users, Polls, and Votes with comprehensive testing
- Added support for cross-referencing polls in the vote repository
