import fc from 'fast-check';
import { AuthService } from './AuthService';
import { connectDatabase, closeDatabase } from '@/config/database';
import { connectRedis, closeRedis } from '@/config/redis';
import { cleanupDatabase, cleanupRedis } from '@/test/helpers';

// Feature: jukeboxd, Property 8: User Authentication Validation
describe('AuthService Property-Based Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
  });

  afterAll(async () => {
    await closeDatabase();
    await closeRedis();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    await cleanupRedis();
  });

  describe('Property 8: User Authentication Validation', () => {
    /**
     * **Validates: Requirements 6.2, 6.3**
     * 
     * Property: For any login attempt, the system should authenticate valid credentials 
     * and reject invalid ones with appropriate responses
     * 
     * Requirements:
     * 6.2: WHEN a user logs in with valid credentials, THE System SHALL authenticate them 
     *      and provide access to personalized features
     * 6.3: WHEN a user logs in with invalid credentials, THE System SHALL reject the attempt 
     *      and display an error message
     */
    it('should authenticate valid credentials and reject invalid ones', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid user credentials
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 128 })
              .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
          }),
          // Generate various login attempts (valid and invalid)
          fc.record({
            usernameOrEmail: fc.oneof(
              fc.string({ minLength: 1, maxLength: 100 }), // Could be username or email
              fc.emailAddress()
            ),
            password: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (userCredentials: { username: string; email: string; password: string }, loginAttempt: { usernameOrEmail: string; password: string }) => {
            const { username, email, password } = userCredentials;
            
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            // Register a user with valid credentials
            const registeredUser = await AuthService.register(username, email, password);
            expect(registeredUser.token).toBeDefined();
            expect(registeredUser.user.username).toBe(username);
            expect(registeredUser.user.email).toBe(email);

            // Determine if login attempt should be valid
            const isValidUsernameOrEmail = 
              loginAttempt.usernameOrEmail === username || 
              loginAttempt.usernameOrEmail === email;
            const isValidPassword = loginAttempt.password === password;
            const shouldAuthenticate = isValidUsernameOrEmail && isValidPassword;

            if (shouldAuthenticate) {
              // Test Requirement 6.2: Valid credentials should authenticate successfully
              const authResult = await AuthService.login(loginAttempt.usernameOrEmail, loginAttempt.password);
              
              // Should return valid auth token
              expect(authResult.token).toBeDefined();
              expect(typeof authResult.token).toBe('string');
              expect(authResult.token.length).toBeGreaterThan(0);
              
              // Should return user profile (access to personalized features)
              expect(authResult.user).toBeDefined();
              expect(authResult.user.id).toBe(registeredUser.user.id);
              expect(authResult.user.username).toBe(username);
              expect(authResult.user.email).toBe(email);
              expect(authResult.user.createdAt).toBeInstanceOf(Date);
              expect(authResult.user.updatedAt).toBeInstanceOf(Date);
              
              // Should not expose sensitive data
              expect((authResult.user as any).passwordHash).toBeUndefined();
              
              // Should have valid expiration date
              expect(authResult.expiresAt).toBeInstanceOf(Date);
              expect(authResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
              
              // Token should be valid for authentication
              const userProfile = await AuthService.validateToken(authResult.token);
              expect(userProfile.id).toBe(registeredUser.user.id);
              expect(userProfile.username).toBe(username);
              expect(userProfile.email).toBe(email);
              
            } else {
              // Test Requirement 6.3: Invalid credentials should be rejected with error message
              await expect(
                AuthService.login(loginAttempt.usernameOrEmail, loginAttempt.password)
              ).rejects.toThrow('Invalid credentials');
              
              // Should not create any valid tokens or sessions
              // (This is implicitly tested by the rejection)
            }
          }
        ), 
        { numRuns: 100 } // Run 100 iterations as specified in design document
      );
    });

    /**
     * Property: Authentication should handle edge cases consistently
     * Tests various edge cases for authentication validation
     */
    it('should handle authentication edge cases consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case inputs
          fc.record({
            usernameOrEmail: fc.oneof(
              fc.constant(''), // Empty string
              fc.constant('   '), // Whitespace only
              fc.constant(null as any), // Null value
              fc.constant(undefined as any), // Undefined value
              fc.string({ minLength: 1, maxLength: 5 }), // Very short strings
              fc.string({ minLength: 200, maxLength: 300 }) // Very long strings
            ),
            password: fc.oneof(
              fc.constant(''), // Empty string
              fc.constant('   '), // Whitespace only
              fc.constant(null as any), // Null value
              fc.constant(undefined as any), // Undefined value
              fc.string({ minLength: 1, maxLength: 5 }), // Very short strings
              fc.string({ minLength: 200, maxLength: 300 }) // Very long strings
            )
          }),
          async (edgeCaseInputs: { usernameOrEmail: any; password: any }) => {
            const { usernameOrEmail, password } = edgeCaseInputs;
            
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            // All edge cases should be rejected with appropriate error messages
            if (!usernameOrEmail || !password) {
              // Empty, null, or undefined credentials should be rejected
              await expect(
                AuthService.login(usernameOrEmail, password)
              ).rejects.toThrow('Username/email and password are required');
            } else {
              // Non-existent users should be rejected with "Invalid credentials"
              await expect(
                AuthService.login(usernameOrEmail, password)
              ).rejects.toThrow('Invalid credentials');
            }
          }
        ), 
        { numRuns: 50 } // Fewer runs for edge cases
      );
    });

    /**
     * Property: Token validation should be consistent with authentication
     * Tests that tokens generated by successful authentication are always valid
     */
    it('should generate tokens that are consistently valid after authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple valid users
          fc.array(
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 })
                .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 128 })
                .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (users: Array<{ username: string; email: string; password: string }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            // Register all users and authenticate them
            for (const user of users) {
              // Register user
              const registeredUser = await AuthService.register(user.username, user.email, user.password);
              
              // Authenticate with username
              const authWithUsername = await AuthService.login(user.username, user.password);
              expect(authWithUsername.token).toBeDefined();
              
              // Validate the token
              const profileFromUsername = await AuthService.validateToken(authWithUsername.token);
              expect(profileFromUsername.id).toBe(registeredUser.user.id);
              expect(profileFromUsername.username).toBe(user.username);
              expect(profileFromUsername.email).toBe(user.email);
              
              // Authenticate with email
              const authWithEmail = await AuthService.login(user.email, user.password);
              expect(authWithEmail.token).toBeDefined();
              
              // Validate the token
              const profileFromEmail = await AuthService.validateToken(authWithEmail.token);
              expect(profileFromEmail.id).toBe(registeredUser.user.id);
              expect(profileFromEmail.username).toBe(user.username);
              expect(profileFromEmail.email).toBe(user.email);
              
              // Both authentication methods should return equivalent user profiles
              expect(profileFromUsername).toEqual(profileFromEmail);
            }
          }
        ), 
        { numRuns: 20 } // Fewer runs due to multiple users per iteration
      );
    });
  });

  describe('Property 9: User Registration Uniqueness', () => {
    /**
     * **Validates: Requirements 6.1**
     * 
     * Property: For any registration attempt, the system should create unique user accounts 
     * and prevent duplicate usernames or emails
     * 
     * Requirements:
     * 6.1: WHEN a new user registers, THE System SHALL create a unique user account with username and password
     */
    it('should create unique user accounts and prevent duplicate usernames or emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple user registration attempts
          fc.array(
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 })
                .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 128 })
                .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (registrationAttempts: Array<{ username: string; email: string; password: string }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            const registeredUsers: Array<{ username: string; email: string; id: string }> = [];
            const seenUsernames = new Set<string>();
            const seenEmails = new Set<string>();

            for (const attempt of registrationAttempts) {
              const { username, email, password } = attempt;
              
              const isDuplicateUsername = seenUsernames.has(username);
              const isDuplicateEmail = seenEmails.has(email);
              const shouldSucceed = !isDuplicateUsername && !isDuplicateEmail;

              if (shouldSucceed) {
                // First time seeing this username and email - should succeed
                const authResult = await AuthService.register(username, email, password);
                
                // Should return valid auth token and user profile
                expect(authResult.token).toBeDefined();
                expect(typeof authResult.token).toBe('string');
                expect(authResult.token.length).toBeGreaterThan(0);
                
                // Should return user profile with correct data
                expect(authResult.user).toBeDefined();
                expect(authResult.user.username).toBe(username);
                expect(authResult.user.email).toBe(email);
                expect(authResult.user.id).toBeDefined();
                expect(authResult.user.createdAt).toBeInstanceOf(Date);
                expect(authResult.user.updatedAt).toBeInstanceOf(Date);
                
                // Should not expose sensitive data
                expect((authResult.user as any).passwordHash).toBeUndefined();
                
                // Should have valid expiration date
                expect(authResult.expiresAt).toBeInstanceOf(Date);
                expect(authResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
                
                // Token should be valid for authentication
                const userProfile = await AuthService.validateToken(authResult.token);
                expect(userProfile.id).toBe(authResult.user.id);
                expect(userProfile.username).toBe(username);
                expect(userProfile.email).toBe(email);
                
                // Track this user as registered
                registeredUsers.push({
                  username,
                  email,
                  id: authResult.user.id
                });
                seenUsernames.add(username);
                seenEmails.add(email);
                
              } else {
                // Duplicate username or email - should fail with appropriate error
                if (isDuplicateUsername) {
                  await expect(
                    AuthService.register(username, email, password)
                  ).rejects.toThrow('Username already exists');
                } else if (isDuplicateEmail) {
                  await expect(
                    AuthService.register(username, email, password)
                  ).rejects.toThrow('Email already exists');
                }
                
                // Should not create any new user or valid tokens
                // (This is implicitly tested by the rejection)
              }
            }

            // Verify all registered users are unique and accessible
            const uniqueUsernames = new Set(registeredUsers.map(u => u.username));
            const uniqueEmails = new Set(registeredUsers.map(u => u.email));
            const uniqueIds = new Set(registeredUsers.map(u => u.id));
            
            expect(uniqueUsernames.size).toBe(registeredUsers.length);
            expect(uniqueEmails.size).toBe(registeredUsers.length);
            expect(uniqueIds.size).toBe(registeredUsers.length);
            
            // Verify each registered user can be authenticated
            for (const user of registeredUsers) {
              // Find the original registration attempt to get the password
              const originalAttempt = registrationAttempts.find(
                attempt => attempt.username === user.username && attempt.email === user.email
              );
              expect(originalAttempt).toBeDefined();
              
              if (originalAttempt) {
                // Should be able to login with username
                const authWithUsername = await AuthService.login(user.username, originalAttempt.password);
                expect(authWithUsername.user.id).toBe(user.id);
                
                // Should be able to login with email
                const authWithEmail = await AuthService.login(user.email, originalAttempt.password);
                expect(authWithEmail.user.id).toBe(user.id);
              }
            }
          }
        ), 
        { numRuns: 100 } // Run 100 iterations as specified in design document
      );
    });

    /**
     * Property: Registration should handle concurrent duplicate attempts consistently
     * Tests that simultaneous registration attempts with same username/email are handled correctly
     */
    it('should handle concurrent duplicate registration attempts consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a base user and multiple duplicate attempts
          fc.record({
            baseUser: fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 })
                .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 128 })
                .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
            }),
            duplicateAttempts: fc.array(
              fc.record({
                username: fc.string({ minLength: 3, maxLength: 50 })
                  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                email: fc.emailAddress(),
                password: fc.string({ minLength: 8, maxLength: 128 })
                  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async (testData: { 
            baseUser: { username: string; email: string; password: string };
            duplicateAttempts: Array<{ username: string; email: string; password: string }>;
          }) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            const { baseUser, duplicateAttempts } = testData;
            
            // Register the base user first
            const baseAuthResult = await AuthService.register(
              baseUser.username, 
              baseUser.email, 
              baseUser.password
            );
            expect(baseAuthResult.user.username).toBe(baseUser.username);
            expect(baseAuthResult.user.email).toBe(baseUser.email);

            // Try to register duplicate attempts
            for (const attempt of duplicateAttempts) {
              const hasDuplicateUsername = attempt.username === baseUser.username;
              const hasDuplicateEmail = attempt.email === baseUser.email;
              
              if (hasDuplicateUsername || hasDuplicateEmail) {
                // Should fail with appropriate error message
                if (hasDuplicateUsername) {
                  await expect(
                    AuthService.register(attempt.username, attempt.email, attempt.password)
                  ).rejects.toThrow('Username already exists');
                } else if (hasDuplicateEmail) {
                  await expect(
                    AuthService.register(attempt.username, attempt.email, attempt.password)
                  ).rejects.toThrow('Email already exists');
                }
              } else {
                // Should succeed if both username and email are unique
                const authResult = await AuthService.register(
                  attempt.username, 
                  attempt.email, 
                  attempt.password
                );
                expect(authResult.user.username).toBe(attempt.username);
                expect(authResult.user.email).toBe(attempt.email);
                expect(authResult.user.id).not.toBe(baseAuthResult.user.id);
              }
            }
          }
        ), 
        { numRuns: 50 } // Fewer runs due to complexity
      );
    });

    /**
     * Property: Registration uniqueness should be case-sensitive for usernames but case-insensitive for emails
     * Tests the case sensitivity behavior for uniqueness validation
     */
    it('should enforce case-sensitive username uniqueness and case-insensitive email uniqueness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s) && s.toLowerCase() !== s.toUpperCase()),
            email: fc.emailAddress()
              .filter(email => email.toLowerCase() !== email.toUpperCase()),
            password: fc.string({ minLength: 8, maxLength: 128 })
              .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
          }),
          async (baseUser: { username: string; email: string; password: string }) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            // Register the base user
            const baseAuthResult = await AuthService.register(
              baseUser.username, 
              baseUser.email, 
              baseUser.password
            );
            expect(baseAuthResult.user.username).toBe(baseUser.username);

            // Test case variations
            const usernameUpper = baseUser.username.toUpperCase();
            const usernameLower = baseUser.username.toLowerCase();
            const emailUpper = baseUser.email.toUpperCase();
            const emailLower = baseUser.email.toLowerCase();
            
            const newPassword = baseUser.password + '1'; // Different password

            // Username case sensitivity: different cases should be allowed (if they're actually different)
            if (usernameUpper !== baseUser.username) {
              const upperUsernameResult = await AuthService.register(
                usernameUpper, 
                `different_${baseUser.email}`, 
                newPassword
              );
              expect(upperUsernameResult.user.username).toBe(usernameUpper);
            }
            
            if (usernameLower !== baseUser.username) {
              const lowerUsernameResult = await AuthService.register(
                usernameLower, 
                `another_${baseUser.email}`, 
                newPassword
              );
              expect(lowerUsernameResult.user.username).toBe(usernameLower);
            }

            // Email case insensitivity: different cases should be rejected
            if (emailUpper !== baseUser.email) {
              await expect(
                AuthService.register(`different_${baseUser.username}`, emailUpper, newPassword)
              ).rejects.toThrow('Email already exists');
            }
            
            if (emailLower !== baseUser.email) {
              await expect(
                AuthService.register(`another_${baseUser.username}`, emailLower, newPassword)
              ).rejects.toThrow('Email already exists');
            }
          }
        ), 
        { numRuns: 30 } // Moderate runs for case sensitivity testing
      );
    });
  });

  describe('Property 12: Password Security', () => {
    /**
     * **Validates: Requirements 7.3**
     * 
     * Property: For any user password, the stored version should be cryptographically hashed 
     * and never stored in plaintext
     * 
     * Requirements:
     * 7.3: WHEN storing user passwords, THE System SHALL hash them using secure cryptographic methods
     */
    it('should cryptographically hash passwords and never store them in plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various password inputs
          fc.array(
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 })
                .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 8, maxLength: 128 })
                .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (users: Array<{ username: string; email: string; password: string }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            const registeredUsers: Array<{ 
              id: string; 
              username: string; 
              email: string; 
              originalPassword: string;
              storedHash: string;
            }> = [];

            // Register all users and collect their password hashes
            for (const user of users) {
              const { username, email, password } = user;
              
              // Register the user
              const authResult = await AuthService.register(username, email, password);
              expect(authResult.user).toBeDefined();
              expect(authResult.user.id).toBeDefined();
              
              // Retrieve the user from database to get the stored password hash
              const { UserModel } = await import('@/models/User');
              const storedUser = await UserModel.findById(authResult.user.id);
              expect(storedUser).toBeDefined();
              expect(storedUser!.passwordHash).toBeDefined();
              
              registeredUsers.push({
                id: authResult.user.id,
                username,
                email,
                originalPassword: password,
                storedHash: storedUser!.passwordHash
              });
            }

            // Verify password security properties for each user
            for (const user of registeredUsers) {
              const { originalPassword, storedHash } = user;
              
              // Property 1: Password should never be stored in plaintext
              expect(storedHash).not.toBe(originalPassword);
              expect(storedHash).not.toContain(originalPassword);
              
              // Property 2: Stored hash should be a proper bcrypt hash
              // bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ followed by cost and salt
              expect(storedHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              
              // Property 3: Hash should have sufficient length (bcrypt produces 60-character hashes)
              expect(storedHash.length).toBe(60);
              
              // Property 4: Hash should contain cost factor (should be >= 10 for security)
              const costMatch = storedHash.match(/^\$2[abxy]\$(\d{2})\$/);
              expect(costMatch).toBeTruthy();
              expect(costMatch).not.toBeNull();
              if (costMatch && costMatch[1]) {
                const cost = parseInt(costMatch[1]);
                expect(cost).toBeGreaterThanOrEqual(10); // Minimum secure cost factor
              } else {
                throw new Error('Failed to extract cost factor from bcrypt hash');
              }
              
              // Property 5: Hash should be verifiable with original password
              const bcrypt = await import('bcrypt');
              const isValid = await bcrypt.compare(originalPassword, storedHash);
              expect(isValid).toBe(true);
              
              // Property 6: Hash should NOT verify with incorrect passwords
              const incorrectPasswords = [
                originalPassword + 'x', // Append character
                'x' + originalPassword, // Prepend character
                originalPassword.toUpperCase(), // Change case
                originalPassword.toLowerCase(), // Change case
                originalPassword.slice(1), // Remove first character
                originalPassword.slice(0, -1), // Remove last character
                '', // Empty string
                'wrongpassword123', // Completely different password
              ];
              
              for (const incorrectPassword of incorrectPasswords) {
                if (incorrectPassword !== originalPassword) {
                  const isInvalidPassword = await bcrypt.compare(incorrectPassword, storedHash);
                  expect(isInvalidPassword).toBe(false);
                }
              }
              
              // Property 7: Each password should produce a unique hash (due to salt)
              // Register the same user again with same password to verify different hash
              await cleanupDatabase();
              await cleanupRedis();
              
              const secondRegistration = await AuthService.register(
                user.username, 
                user.email, 
                originalPassword
              );
              const { UserModel } = await import('@/models/User');
              const secondStoredUser = await UserModel.findById(secondRegistration.user.id);
              expect(secondStoredUser).toBeDefined();
              
              // Same password should produce different hash due to salt
              expect(secondStoredUser!.passwordHash).not.toBe(storedHash);
              expect(secondStoredUser!.passwordHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              
              // But both hashes should verify the same password
              const firstHashValid = await bcrypt.compare(originalPassword, storedHash);
              const secondHashValid = await bcrypt.compare(originalPassword, secondStoredUser!.passwordHash);
              expect(firstHashValid).toBe(true);
              expect(secondHashValid).toBe(true);
              
              // Clean up for next iteration
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 20 } // Reduced iterations for faster test execution
      );
    });

    /**
     * Property: Password hashing should be consistent across authentication operations
     * Tests that password verification works correctly during login operations
     */
    it('should maintain password hash integrity across authentication operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate user with various password characteristics
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 })
              .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 128 })
              .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
          }),
          // Generate various login attempts
          fc.array(
            fc.record({
              usernameOrEmail: fc.string({ minLength: 1, maxLength: 100 }),
              password: fc.string({ minLength: 1, maxLength: 200 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (user: { username: string; email: string; password: string }, loginAttempts: Array<{ usernameOrEmail: string; password: string }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            // Register the user
            const authResult = await AuthService.register(user.username, user.email, user.password);
            expect(authResult.user).toBeDefined();
            
            // Get the stored password hash
            const { UserModel } = await import('@/models/User');
            const storedUser = await UserModel.findById(authResult.user.id);
            expect(storedUser).toBeDefined();
            const originalHash = storedUser!.passwordHash;
            
            // Verify the hash is secure
            expect(originalHash).not.toBe(user.password);
            expect(originalHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
            
            // Test various login attempts
            for (const attempt of loginAttempts) {
              const isCorrectUser = attempt.usernameOrEmail === user.username || attempt.usernameOrEmail === user.email;
              const isCorrectPassword = attempt.password === user.password;
              const shouldSucceed = isCorrectUser && isCorrectPassword;
              
              if (shouldSucceed) {
                // Valid login should succeed
                const loginResult = await AuthService.login(attempt.usernameOrEmail, attempt.password);
                expect(loginResult.user.id).toBe(authResult.user.id);
                expect(loginResult.token).toBeDefined();
                
                // Verify password hash hasn't changed after successful login
                const userAfterLogin = await UserModel.findById(authResult.user.id);
                expect(userAfterLogin!.passwordHash).toBe(originalHash);
                
              } else {
                // Invalid login should fail
                await expect(
                  AuthService.login(attempt.usernameOrEmail, attempt.password)
                ).rejects.toThrow();
                
                // Verify password hash hasn't changed after failed login
                const userAfterFailedLogin = await UserModel.findById(authResult.user.id);
                expect(userAfterFailedLogin!.passwordHash).toBe(originalHash);
              }
            }
            
            // Verify hash integrity after all operations
            const finalUser = await UserModel.findById(authResult.user.id);
            expect(finalUser!.passwordHash).toBe(originalHash);
            expect(finalUser!.passwordHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
            
            // Verify original password still works
            const bcrypt = await import('bcrypt');
            const finalHashValid = await bcrypt.compare(user.password, finalUser!.passwordHash);
            expect(finalHashValid).toBe(true);
          }
        ), 
        { numRuns: 10 } // Reduced runs due to multiple login attempts per iteration
      );
    });

    /**
     * Property: Password security should handle edge cases and special characters
     * Tests password hashing with various character sets and edge cases
     */
    it('should securely hash passwords with special characters and edge cases', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate passwords with various characteristics
          fc.array(
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 })
                .filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              email: fc.emailAddress(),
              password: fc.oneof(
                // Standard valid passwords
                fc.string({ minLength: 8, maxLength: 128 })
                  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s)),
                // Passwords with special characters
                fc.string({ minLength: 8, maxLength: 128 })
                  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(s)),
                // Passwords with unicode characters (but still meeting basic requirements)
                fc.string({ minLength: 8, maxLength: 128 })
                  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
                  .map(s => s + 'Ñ1'), // Add unicode character while maintaining requirements
                // Maximum length passwords
                fc.string({ minLength: 128, maxLength: 128 })
                  .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s))
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (users: Array<{ username: string; email: string; password: string }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const user of users) {
              const { username, email, password } = user;
              
              // Register user with potentially complex password
              const authResult = await AuthService.register(username, email, password);
              expect(authResult.user).toBeDefined();
              
              // Get stored hash
              const { UserModel } = await import('@/models/User');
              const storedUser = await UserModel.findById(authResult.user.id);
              expect(storedUser).toBeDefined();
              const storedHash = storedUser!.passwordHash;
              
              // Verify security properties regardless of password complexity
              expect(storedHash).not.toBe(password);
              expect(storedHash).not.toContain(password);
              expect(storedHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              expect(storedHash.length).toBe(60);
              
              // Verify hash can be used for authentication
              const bcrypt = await import('bcrypt');
              const isValid = await bcrypt.compare(password, storedHash);
              expect(isValid).toBe(true);
              
              // Verify login works with complex password
              const loginResult = await AuthService.login(username, password);
              expect(loginResult.user.id).toBe(authResult.user.id);
              expect(loginResult.token).toBeDefined();
              
              // Clean up for next user
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 5 } // Reduced runs for complex password testing
      );
    });
  });
});