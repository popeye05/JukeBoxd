import request from 'supertest';
import { app } from '@/server';
import { connectDatabase, closeDatabase, query } from '@/config/database';
import { connectRedis, closeRedis } from '@/config/redis';

describe('Auth Routes', () => {
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

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should return 409 for duplicate username', async () => {
      const userData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'TestPassword123'
      };

      const userData2 = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'TestPassword123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData1)
        .expect(201);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toContain('Username already exists');
    });

    it('should return 409 for duplicate email', async () => {
      const userData1 = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      const userData2 = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'TestPassword123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData1)
        .expect(201);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData2)
        .expect(409);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toContain('Email already exists');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        username: 'ab', // Too short
        email: 'invalid-email',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123'
        });
    });

    it('should login with username successfully', async () => {
      const loginData = {
        usernameOrEmail: 'testuser',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should login with email successfully', async () => {
      const loginData = {
        usernameOrEmail: 'test@example.com',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        usernameOrEmail: 'testuser',
        password: 'WrongPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        usernameOrEmail: 'nonexistent',
        password: 'TestPassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123'
        });

      authToken = registerResponse.body.data.token;
    });

    it('should return current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Authorization header required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123'
        });

      authToken = registerResponse.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');

      // Token should be invalid after logout
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Authorization header required');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123'
        });

      authToken = registerResponse.body.data.token;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(authToken); // Should be a new token
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Authorization header required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBeUndefined();
      expect(response.body.error.message).toBe('Invalid token');
    });
  });
});