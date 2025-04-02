const fetch = require('node-fetch');
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_USER_INFO_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URL,
} from './config';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

/**
 * Exchange an authorization code for access tokens
 * @param code The authorization code from Google
 * @returns Token response from Google
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: REDIRECT_URL,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/**
 * Get the user's profile information using an access token
 * @param accessToken Access token from Google
 * @returns User profile information
 */
export async function getUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}
