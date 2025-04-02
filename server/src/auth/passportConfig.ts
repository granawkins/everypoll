/**
 * Passport configuration for authentication strategies
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from './env';
import { getRepositories, User } from '../database';

/**
 * Configure passport with Google OAuth 2.0 strategy
 */
export function configurePassport(): void {
  const { userRepository } = getRepositories();

  // Serialize user to session
  passport.serializeUser((user, done) => {
    // Type assertion here helps with compatibility
    done(null, (user as User).id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = userRepository.getById(id);
      done(null, user);
    } catch (error) {
      // Second parameter omitted to fix type issue
      done(error);
    }
  });

  // Configure Google OAuth strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Extract profile information
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || profile.name?.givenName;

            if (!email) {
              // Omit second parameter to fix type error
              return done(new Error('No email found in Google profile'));
            }

            // Look up the user by email
            let user = userRepository.getByEmail(email);

            if (user) {
              // Update user information if needed - use undefined instead of null
              user = userRepository.update(user.id, email, name || undefined);
            } else {
              // Create a new user with Google profile info - use undefined instead of null
              user = userRepository.create(email, name || undefined);
            }

            return done(null, user);
          } catch (error) {
            // Omit second parameter to fix type error
            return done(error as Error);
          }
        }
      )
    );
  } else {
    console.warn(
      'Google OAuth credentials not found. Google authentication will not be available.'
    );
  }
}
