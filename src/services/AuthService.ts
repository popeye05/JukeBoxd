import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { User, UserProfile, AuthToken } from '../types';
import { setSession, deleteSession } from '../config/redis';
import { createError } from '../middleware/errorHandler';
import { DataPersistenceService } from './DataPersistenceService';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Register a new user
   */
  static async register(username: string, email: string, password: string): Promise<AuthToken> {
    // Validate input
    this.validateRegistrationInput(username, email, password);

    // Check if username already exists
    if (await UserModel.usernameExists(username)) {
      throw createError('Username already exists', 409);
    }

    // Check if email already exists
    if (await UserModel.emailExists(email)) {
      throw createError('Email already exists', 409);
    }

    try {
      // Create the user
      const user = await UserModel.create(username, email, password);
      
      // Generate auth token
      return await this.generateAuthToken(user);
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation
        if (error.constraint?.includes('username')) {
          throw createError('Username already exists', 409);
        }
        if (error.constraint?.includes('email')) {
          throw createError('Email already exists', 409);
        }
      }
      throw createError('Registration failed', 500);
    }
  }

  /**
   * Login user with username/email and password
   */
  static async login(usernameOrEmail: string, password: string): Promise<AuthToken> {
    // Validate input
    if (!usernameOrEmail || !password) {
      throw createError('Username/email and password are required', 400);
    }

    // Find user by username or email
    let user: User | null = null;
    
    if (usernameOrEmail.includes('@')) {
      user = await UserModel.findByEmail(usernameOrEmail);
    } else {
      user = await UserModel.findByUsername(usernameOrEmail);
    }

    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate auth token
    return await this.generateAuthToken(user);
  }

  /**
   * Validate JWT token and return user profile
   */
  static async validateToken(token: string): Promise<UserProfile> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (!decoded.userId || !decoded.sessionId) {
        throw createError('Invalid token format', 401);
      }

      // Check if session exists in Redis
      const sessionKey = `session:${decoded.sessionId}`;
      const sessionData = await this.getSessionData(sessionKey);
      
      if (!sessionData || sessionData.userId !== decoded.userId) {
        throw createError('Session expired or invalid', 401);
      }

      // Get current user data
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw createError('User not found', 401);
      }

      return UserModel.toProfile(user);
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        throw createError('Invalid token', 401);
      }
      if (error.name === 'TokenExpiredError') {
        throw createError('Token expired', 401);
      }
      throw error;
    }
  }

  /**
   * Logout user by invalidating session
   */
  static async logout(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.sessionId) {
        await deleteSession(decoded.sessionId);
      }
    } catch (error) {
      // Token might be invalid, but we still want to attempt logout
      console.warn('Logout attempted with invalid token:', error);
    }
  }

  /**
   * Generate JWT token and create session
   */
  private static async generateAuthToken(user: User): Promise<AuthToken> {
    const sessionId = uuidv4();
    const userProfile = UserModel.toProfile(user);

    // Create session data
    const sessionData = {
      userId: user.id,
      username: user.username,
      email: user.email,
      createdAt: new Date().toISOString()
    };

    // Store session in Redis
    await setSession(sessionId, sessionData, this.SESSION_TTL);

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      sessionId: sessionId,
      username: user.username
    };

    const token = jwt.sign(tokenPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'jukeboxd',
      audience: 'jukeboxd-users'
    } as jwt.SignOptions);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    return {
      token,
      user: userProfile,
      expiresAt
    };
  }

  /**
   * Get session data from Redis
   */
  private static async getSessionData(sessionKey: string): Promise<any | null> {
    try {
      const { getSession } = await import('@/config/redis');
      return await getSession(sessionKey.replace('session:', ''));
    } catch (error) {
      console.error('Failed to get session data:', error);
      return null;
    }
  }

  /**
   * Validate registration input
   */
  private static validateRegistrationInput(username: string, email: string, password: string): void {
    if (!username || !email || !password) {
      throw createError('Username, email, and password are required', 400);
    }

    // Username validation
    if (username.length < 3 || username.length > 50) {
      throw createError('Username must be between 3 and 50 characters', 400);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw createError('Username can only contain letters, numbers, underscores, and hyphens', 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Invalid email format', 400);
    }

    if (email.length > 255) {
      throw createError('Email must be less than 255 characters', 400);
    }

    // Password validation
    if (password.length < 8) {
      throw createError('Password must be at least 8 characters long', 400);
    }

    if (password.length > 128) {
      throw createError('Password must be less than 128 characters', 400);
    }

    // Check for at least one uppercase, one lowercase, one number
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw createError('Password must contain at least one uppercase letter, one lowercase letter, and one number', 400);
    }
  }

  /**
   * Refresh token (extend session)
   */
  static async refreshToken(token: string): Promise<AuthToken> {
    const userProfile = await this.validateToken(token);
    const user = await UserModel.findById(userProfile.id);
    
    if (!user) {
      throw createError('User not found', 401);
    }

    return await this.generateAuthToken(user);
  }

  /**
   * Delete user account with proper data handling
   * Removes personal data while preserving anonymized contributions
   */
  static async deleteAccount(userId: string): Promise<void> {
    try {
      // Create audit trail before deletion
      await DataPersistenceService.createAccountDeletionAudit(userId);

      // Execute account deletion with immediate persistence
      await DataPersistenceService.executeWithPersistence(async (client) => {
        // 1. Delete user sessions from Redis
        await this.deleteAllUserSessions(userId);

        // 2. Anonymize ratings and reviews instead of deleting them
        // This preserves the integrity of album statistics and community data
        await client.query(
          `UPDATE ratings SET user_id = NULL WHERE user_id = $1`,
          [userId]
        );

        await client.query(
          `UPDATE reviews SET user_id = NULL WHERE user_id = $1`,
          [userId]
        );

        // 3. Remove all follow relationships
        await client.query(
          `DELETE FROM follows WHERE follower_id = $1 OR followee_id = $1`,
          [userId]
        );

        // 4. Anonymize activities instead of deleting them
        // This preserves the activity feed history for other users
        await client.query(
          `UPDATE activities SET user_id = NULL WHERE user_id = $1`,
          [userId]
        );

        // 5. Finally, delete the user record (personal data)
        const deleteResult = await client.query(
          `DELETE FROM users WHERE id = $1`,
          [userId]
        );

        if (deleteResult.rowCount === 0) {
          throw createError('User not found', 404);
        }

        return deleteResult;
      });

      // Ensure immediate persistence
      await DataPersistenceService.ensureImmediatePersistence();
    } catch (error: any) {
      console.error('Account deletion failed:', error);
      throw createError('Account deletion failed', 500);
    }
  }

  /**
   * Delete all user sessions from Redis
   */
  private static async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const { getRedisClient } = await import('@/config/redis');
      const redis = getRedisClient();
      
      // Find all sessions for this user
      const sessionKeys = await redis.keys('session:*');
      
      for (const sessionKey of sessionKeys) {
        const sessionData = await redis.get(sessionKey);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.userId === userId) {
            await redis.del(sessionKey);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete user sessions:', error);
      // Don't throw here - session cleanup is not critical for account deletion
    }
  }
}