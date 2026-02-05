import { connectDatabase, query, closeDatabase } from '@/config/database';

describe('Account Deletion Audit Table Migration', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it('should create account deletion audit table', async () => {
    // Create the audit table
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

    // Create indexes
    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_deleted_at ON account_deletion_audit(deleted_at)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_user_id ON account_deletion_audit(user_id)
    `);

    // Verify table was created
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'account_deletion_audit'
    `);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].table_name).toBe('account_deletion_audit');
  });
});