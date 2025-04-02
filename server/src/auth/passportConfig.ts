/**
 * Passport configuration for authentication strategies
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } from './env';
import { getRepositories, User } from '../database';

/**
 * Configure passport with Google OAuth 2.0 strategy
 */
export function configurePassport(): void {
  const { userRepository } = getRepositories();

  // Serialize user to session
  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = userRepository.getById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
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
              return done(new Error('No email found in Google profile'), null);
            }

            // Look up the user by email
            let user = userRepository.getByEmail(email);

            if (user) {
              // Update user information if needed
              user = userRepository.update(user.id, email, name || null);
            } else {
              // Create a new user with Google profile info
              user = userRepository.create(email, name || null);
            }

            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        }
      )
    );
  } else {
    console.warn('Google OAuth credentials not found. Google authentication will not be available.');
  }
}
