-- This migration adds a Google OAuth ID field to the users table
-- This allows linking user accounts to their Google profiles

ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
