/**
 * Google OAuth configuration
 *
 * In a production environment, these values would be loaded from environment variables
 */

// Google OAuth endpoints
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USER_INFO_URL =
  'https://www.googleapis.com/oauth2/v2/userinfo';

// OAuth client configuration
// These values would typically be stored in environment variables
export const GOOGLE_CLIENT_ID = 'your-google-client-id';
export const GOOGLE_CLIENT_SECRET = 'your-google-client-secret';
export const REDIRECT_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://everypoll.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback';

// OAuth scopes
export const SCOPES = ['email', 'profile'];

/**
 * Generate Google OAuth URL for login
 * @param state Optional state parameter for CSRF protection
 * @returns Authorization URL to redirect the user to
 */
export function generateAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URL,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  // Add state parameter if provided (for CSRF protection)
  if (state) {
    params.append('state', state);
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
