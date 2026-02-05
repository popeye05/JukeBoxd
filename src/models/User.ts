import { query } from '@/config/database';
import { User, UserProfile, QueryResult } from '@/types';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Create a new user with hashed password
   */
  static async create(username: string, email: string, password: string): Promise<User> {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const id = uuidv4();

    const result: QueryResult<any> = await query(
      `INSERT INTO users (id, username, email, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, password_hash, created_at, updated_at`,
      [id, username, email, passwordHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const result: QueryResult<any> = await query(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * Verify password against stored hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Convert User to UserProfile (without sensitive data)
   */
  static toProfile(user: User): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0 || !result.rows[0]) {
      return false;
    }
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Check if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    const result: QueryResult<{ count: string }> = await query(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0 || !result.rows[0]) {
      return false;
    }
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Update user's last login timestamp (for future use)
   */
  static async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete user by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result: QueryResult = await query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }
}