import {
  generateAuthUrl,
  GOOGLE_AUTH_URL,
  SCOPES,
  GOOGLE_CLIENT_ID,
  REDIRECT_URL,
} from '../../../services/google/config';

describe('Google OAuth Config', () => {
  it('should generate auth URL with correct parameters', () => {
    const authUrl = generateAuthUrl();

    // Check that the URL starts with the correct base URL
    expect(authUrl.startsWith(GOOGLE_AUTH_URL)).toBe(true);

    // Parse the URL to check parameters
    const url = new URL(authUrl);

    // Check required OAuth parameters
    expect(url.searchParams.get('client_id')).toBe(GOOGLE_CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URL);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(SCOPES.join(' '));
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');

    // State should not be present if not provided
    expect(url.searchParams.has('state')).toBe(false);
  });

  it('should include state parameter when provided', () => {
    const testState = 'test-state-value';
    const authUrl = generateAuthUrl(testState);

    const url = new URL(authUrl);
    expect(url.searchParams.get('state')).toBe(testState);
  });
});
