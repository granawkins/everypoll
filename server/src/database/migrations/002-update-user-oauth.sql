-- This migration adds a Google OAuth ID field to the users table
-- This allows linking user accounts to their Google profiles

-- First add the column without the UNIQUE constraint (SQLite limitation)
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Then create a separate unique index for the column
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
