import { DataPersistenceService } from './DataPersistenceService';
import { connectDatabase, query, closeDatabase } from '@/config/database';
import { UserModel } from '@/models/User';
import { v4 as uuidv4 } from 'uuid';

describe('DataPersistenceService', () => {
  beforeAll(async () => {
    await connectDatabase();
    
    // Create audit table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS account_deletion_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ratings_count INTEGER DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        follows_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await query('DELETE FROM account_deletion_audit WHERE user_id LIKE $1', ['test-%']);
    await query('DELETE FROM users WHERE username LIKE $1', ['testuser%']);
  });

  describe('executeWithPersistence', () => {
    it('should execute operation and validate persistence', async () => {
      const testUserId = uuidv4();
      const testUsername = `testuser_${Date.now()}`;
      
      const result = await DataPersistenceService.executeWithPersistence(
        async (client) => {
          return await UserModel.create(testUsername, `${testUsername}@test.com`, 'TestPass123!');
        },
        'SELECT id FROM users WHERE username = $1',
        [testUsername]
      );

      expect(result).toBeDefined();
      expect(result.username).toBe(testUsername);

      // Verify the user was actually persisted
      const persistedUser = await UserModel.findByUsername(testUsername);
      expect(persistedUser).toBeDefined();
      expect(persistedUser?.username).toBe(testUsername);
    });

    it('should rollback on operation failure', async () => {
      const testUsername = `testuser_${Date.now()}`;
      
      await expect(
        DataPersistenceService.executeWithPersistence(
          async (client) => {
            // Create user first
            await UserModel.create(testUsername, `${testUsername}@test.com`, 'TestPass123!');
            // Then throw an error to trigger rollback
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');

      // Verify the user was not persisted due to rollback
      const persistedUser = await UserModel.findByUsername(testUsername);
      expect(persistedUser).toBeNull();
    });
  });

  describe('validateDataExists', () => {
    it('should return true for existing data', async () => {
      const testUsername = `testuser_${Date.now()}`;
      const user = await UserModel.create(testUsername, `${testUsername}@test.com`, 'TestPass123!');

      const exists = await DataPersistenceService.validateDataExists('users', {
        id: user.id,
        username: testUsername
      });

      expect(exists).toBe(true);
    });

    it('should return false for non-existing data', async () => {
      const exists = await DataPersistenceService.validateDataExists('users', {
        id: uuidv4(),
        username: 'nonexistent'
      });

      expect(exists).toBe(false);
    });
  });

  describe('validateReferentialIntegrity', () => {
    it('should pass for valid references', async () => {
      const testUsername = `testuser_${Date.now()}`;
      const user = await UserModel.create(testUsername, `${testUsername}@test.com`, 'TestPass123!');

      await expect(
        DataPersistenceService.validateReferentialIntegrity([
          {
            table: 'ratings',
            column: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id',
            value: user.id
          }
        ])
      ).resolves.not.toThrow();
    });

    it('should throw for invalid references', async () => {
      await expect(
        DataPersistenceService.validateReferentialIntegrity([
          {
            table: 'ratings',
            column: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id',
            value: uuidv4()
          }
        ])
      ).rejects.toThrow('Referential integrity violation');
    });
  });

  describe('createAccountDeletionAudit', () => {
    it('should create audit record for account deletion', async () => {
      const testUserId = uuidv4();

      await DataPersistenceService.createAccountDeletionAudit(testUserId);

      // Verify audit record was created
      const auditResult = await query(
        'SELECT * FROM account_deletion_audit WHERE user_id = $1',
        [testUserId]
      );

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].user_id).toBe(testUserId);
      expect(auditResult.rows[0].ratings_count).toBe(0);
      expect(auditResult.rows[0].reviews_count).toBe(0);
      expect(auditResult.rows[0].follows_count).toBe(0);
    });
  });
});