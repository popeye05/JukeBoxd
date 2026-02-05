import { AuthService } from './AuthService';
import { UserModel } from '@/models/User';
import { connectDatabase, closeDatabase, query } from '@/config/database';
import { connectRedis, closeRedis } from '@/config/redis';
import jwt from 'jsonwebtoken';

describe('AuthService', () => {
  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
  });

  afterAll(async () => {
    await closeDatabase();
    await closeRedis();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await query('DELETE FROM users');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      const authToken = await AuthService.register(username, email, password);

      expect(authToken.token).toBeDefined();
      expect(authToken.user.username).toBe(username);
      expect(authToken.user.email).toBe(email);
      expect(authToken.expiresAt).toBeInstanceOf(Date);
      expect((authToken.user as any).passwordHash).toBeUndefined();
    });

    it('should throw error for duplicate username', async () => {
      const username = 'testuser';
      const password = 'TestPassword123';

      await AuthService.register(username, 'test1@example.com', password);

      await expect(
        AuthService.register(username, 'test2@example.com', password)
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error for duplicate email', async () => {
      const email = 'test@example.com';
      const password = 'TestPassword123';

      await AuthService.register('testuser1', email, password);

      await expect(
        AuthService.register('testuser2', email, password)
      ).rejects.toThrow('Email already exists');
    });

    it('should throw error for invalid username', async () => {
      await expect(
        AuthService.register('ab', 'test@example.com', 'TestPassword123')
      ).rejects.toThrow('Username must be between 3 and 50 characters');

      await expect(
        AuthService.register('user@invalid', 'test@example.com', 'TestPassword123')
      ).rejects.toThrow('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should throw error for invalid email', async () => {
      await expect(
        AuthService.register('testuser', 'invalid-email', 'TestPassword123')
      ).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      await expect(
        AuthService.register('testuser', 'test@example.com', 'weak')
      ).rejects.toThrow('Password must be at least 8 characters long');

      await expect(
        AuthService.register('testuser', 'test@example.com', 'weakpassword')
      ).rejects.toThrow('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await AuthService.register('testuser', 'test@example.com', 'TestPassword123');
    });

    it('should login with username successfully', async () => {
      const authToken = await AuthService.login('testuser', 'TestPassword123');

      expect(authToken.token).toBeDefined();
      expect(authToken.user.username).toBe('testuser');
      expect(authToken.user.email).toBe('test@example.com');
      expect(authToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should login with email successfully', async () => {
      const authToken = await AuthService.login('test@example.com', 'TestPassword123');

      expect(authToken.token).toBeDefined();
      expect(authToken.user.username).toBe('testuser');
      expect(authToken.user.email).toBe('test@example.com');
      expect(authToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        AuthService.login('nonexistent', 'TestPassword123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for incorrect password', async () => {
      await expect(
        AuthService.login('testuser', 'WrongPassword123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for missing credentials', async () => {
      await expect(
        AuthService.login('', 'TestPassword123')
      ).rejects.toThrow('Username/email and password are required');

      await expect(
        AuthService.login('testuser', '')
      ).rejects.toThrow('Username/email and password are required');
    });
  });

  describe('validateToken', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const authToken = await AuthService.register('testuser', 'test@example.com', 'TestPassword123');
      validToken = authToken.token;
      userId = authToken.user.id;
    });

    it('should validate valid token successfully', async () => {
      const userProfile = await AuthService.validateToken(validToken);

      expect(userProfile.id).toBe(userId);
      expect(userProfile.username).toBe('testuser');
      expect(userProfile.email).toBe('test@example.com');
      expect((userProfile as any).passwordHash).toBeUndefined();
    });

    it('should throw error for invalid token', async () => {
      await expect(
        AuthService.validateToken('invalid-token')
      ).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: userId, sessionId: 'test-session' },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '-1h' }
      );

      await expect(
        AuthService.validateToken(expiredToken)
      ).rejects.toThrow('Token expired');
    });

    it('should throw error for token without session', async () => {
      // First logout to invalidate session
      await AuthService.logout(validToken);

      await expect(
        AuthService.validateToken(validToken)
      ).rejects.toThrow('Session expired or invalid');
    });
  });

  describe('logout', () => {
    it('should logout successfully with valid token', async () => {
      const authToken = await AuthService.register('testuser', 'test@example.com', 'TestPassword123');
      
      // Should not throw error
      await expect(AuthService.logout(authToken.token)).resolves.not.toThrow();

      // Token should be invalid after logout
      await expect(
        AuthService.validateToken(authToken.token)
      ).rejects.toThrow('Session expired or invalid');
    });

    it('should handle logout with invalid token gracefully', async () => {
      // Should not throw error even with invalid token
      await expect(AuthService.logout('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('refreshToken', () => {
    let validToken: string;

    beforeEach(async () => {
      const authToken = await AuthService.register('testuser', 'test@example.com', 'TestPassword123');
      validToken = authToken.token;
    });

    it('should refresh token successfully', async () => {
      const newAuthToken = await AuthService.refreshToken(validToken);

      expect(newAuthToken.token).toBeDefined();
      expect(newAuthToken.token).not.toBe(validToken); // Should be a new token
      expect(newAuthToken.user.username).toBe('testuser');
      expect(newAuthToken.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for invalid token', async () => {
      await expect(
        AuthService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid token');
    });
  });
});