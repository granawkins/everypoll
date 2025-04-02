import {
  exchangeCodeForTokens,
  getUserInfo,
} from '../../../services/google/auth';
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_USER_INFO_URL,
} from '../../../services/google/config';

// Mock global fetch
const mockedFetch = jest.fn();
// Check if fetch is available globally (Node.js v18+)
if (typeof global.fetch === 'undefined') {
  // Polyfill fetch for test environment if needed
  global.fetch = mockedFetch as unknown as typeof fetch;
} else {
  // Mock the existing global fetch
  global.fetch = mockedFetch as unknown as typeof fetch;
}

// Create a simple Response class for tests
class MockResponse {
  private status: number;
  private body: string;

  constructor(body: string, { status = 200 } = {}) {
    this.status = status;
    this.body = body;
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }

  text() {
    return Promise.resolve(this.body);
  }
}

describe('Google OAuth Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        id_token: 'mock-id-token',
      };

      // Mock the fetch response
      mockedFetch.mockResolvedValueOnce(
        new MockResponse(JSON.stringify(mockTokenResponse), { status: 200 })
      );

      const result = await exchangeCodeForTokens('test-auth-code');

      // Check that fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        GOOGLE_TOKEN_URL,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('code=test-auth-code'),
        })
      );

      // Check returned tokens
      expect(result).toEqual(mockTokenResponse);
    });

    it('should throw error if token request fails', async () => {
      // Mock a failed response
      mockedFetch.mockResolvedValueOnce(
        new MockResponse('Invalid authorization code', { status: 400 })
      );

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        'Failed to exchange code for tokens'
      );
    });
  });

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const mockUserInfo = {
        id: 'google-user-id',
        email: 'test@example.com',
        verified_email: true,
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
      };

      // Mock the fetch response
      mockedFetch.mockResolvedValueOnce(
        new MockResponse(JSON.stringify(mockUserInfo), { status: 200 })
      );

      const result = await getUserInfo('test-access-token');

      // Check that fetch was called with correct parameters
      expect(mockedFetch).toHaveBeenCalledWith(
        GOOGLE_USER_INFO_URL,
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-access-token',
          },
        })
      );

      // Check returned user info
      expect(result).toEqual(mockUserInfo);
    });

    it('should throw error if user info request fails', async () => {
      // Mock a failed response
      mockedFetch.mockResolvedValueOnce(
        new MockResponse('Invalid token', { status: 401 })
      );

      await expect(getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to get user info'
      );
    });
  });
});
