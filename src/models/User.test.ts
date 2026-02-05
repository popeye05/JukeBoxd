import { UserModel } from './User';
import { connectDatabase, closeDatabase, query } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';

describe('UserModel', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up users table before each test
    await query('DELETE FROM users');
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      const user = await UserModel.create(username, email, password);

      expect(user.id).toBeDefined();
      expect(user.username).toBe(username);
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(password); // Should be hashed
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for duplicate username', async () => {
      const username = 'testuser';
      const email1 = 'test1@example.com';
      const email2 = 'test2@example.com';
      const password = 'TestPassword123';

      await UserModel.create(username, email1, password);

      await expect(
        UserModel.create(username, email2, password)
      ).rejects.toThrow();
    });

    it('should throw error for duplicate email', async () => {
      const username1 = 'testuser1';
      const username2 = 'testuser2';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      await UserModel.create(username1, email, password);

      await expect(
        UserModel.create(username2, email, password)
      ).rejects.toThrow();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      const createdUser = await UserModel.create(username, email, password);
      const foundUser = await UserModel.findByUsername(username);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(username);
      expect(foundUser!.email).toBe(email);
    });

    it('should return null for non-existent username', async () => {
      const foundUser = await UserModel.findByUsername('nonexistent');
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      const createdUser = await UserModel.create(username, email, password);
      const foundUser = await UserModel.findByEmail(email);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(username);
      expect(foundUser!.email).toBe(email);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserModel.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const username = 'testuser';
      const email = 'test@example.com';
      const password = 'TestPassword123';

      const createdUser = await UserModel.create(username, email, password);
      const foundUser = await UserModel.findById(createdUser.id);

      expect(foundUser).not.toBeNull();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(username);
      expect(foundUser!.email).toBe(email);
    });

    it('should return null for non-existent ID', async () => {
      const foundUser = await UserModel.findById(uuidv4());
      expect(foundUser).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const user = await UserModel.create('testuser', 'test@example.com', password);

      const isValid = await UserModel.verifyPassword(password, user.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const user = await UserModel.create('testuser', 'test@example.com', password);

      const isValid = await UserModel.verifyPassword(wrongPassword, user.passwordHash);
      expect(isValid).toBe(false);
    });
  });

  describe('toProfile', () => {
    it('should convert User to UserProfile without sensitive data', async () => {
      const user = await UserModel.create('testuser', 'test@example.com', 'TestPassword123');
      const profile = UserModel.toProfile(user);

      expect(profile.id).toBe(user.id);
      expect(profile.username).toBe(user.username);
      expect(profile.email).toBe(user.email);
      expect(profile.createdAt).toBe(user.createdAt);
      expect(profile.updatedAt).toBe(user.updatedAt);
      expect((profile as any).passwordHash).toBeUndefined();
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      const username = 'testuser';
      await UserModel.create(username, 'test@example.com', 'TestPassword123');

      const exists = await UserModel.usernameExists(username);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing username', async () => {
      const exists = await UserModel.usernameExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const email = 'test@example.com';
      await UserModel.create('testuser', email, 'TestPassword123');

      const exists = await UserModel.emailExists(email);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const exists = await UserModel.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });
  });

  describe('deleteById', () => {
    it('should delete user by ID', async () => {
      const user = await UserModel.create('testuser', 'test@example.com', 'TestPassword123');
      
      const deleted = await UserModel.deleteById(user.id);
      expect(deleted).toBe(true);

      const foundUser = await UserModel.findById(user.id);
      expect(foundUser).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await UserModel.deleteById(uuidv4());
      expect(deleted).toBe(false);
    });
  });
});