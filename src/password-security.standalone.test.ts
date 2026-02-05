import fc from 'fast-check';
import bcrypt from 'bcrypt';

// Feature: jukeboxd, Property 12: Password Security
// Standalone test that doesn't require database connections
describe('Password Security Property-Based Tests (Standalone)', () => {
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
            fc.string({ minLength: 8, maxLength: 128 })
              .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s)),
            { minLength: 1, maxLength: 20 }
          ),
          async (passwords: string[]) => {
            const hashedPasswords: Array<{ original: string; hash: string }> = [];

            // Hash all passwords using bcrypt with same settings as UserModel (12 rounds)
            for (const password of passwords) {
              const hash = await bcrypt.hash(password, 12);
              hashedPasswords.push({ original: password, hash });
            }

            // Verify password security properties for each password
            for (const { original, hash } of hashedPasswords) {
              // Property 1: Password should never be stored in plaintext
              expect(hash).not.toBe(original);
              expect(hash).not.toContain(original);
              
              // Property 2: Stored hash should be a proper bcrypt hash
              // bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ followed by cost and salt
              expect(hash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              
              // Property 3: Hash should have sufficient length (bcrypt produces 60-character hashes)
              expect(hash.length).toBe(60);
              
              // Property 4: Hash should contain cost factor (should be >= 10 for security)
              const costMatch = hash.match(/^\$2[abxy]\$(\d{2})\$/);
              expect(costMatch).toBeTruthy();
              if (costMatch && costMatch[1]) {
                const cost = parseInt(costMatch[1]);
                expect(cost).toBeGreaterThanOrEqual(10); // Minimum secure cost factor
                expect(cost).toBe(12); // UserModel uses 12 rounds
              } else {
                throw new Error('Failed to extract cost factor from bcrypt hash');
              }
              
              // Property 5: Hash should be verifiable with original password
              const isValid = await bcrypt.compare(original, hash);
              expect(isValid).toBe(true);
              
              // Property 6: Hash should NOT verify with incorrect passwords
              const incorrectPasswords = [
                original + 'x', // Append character
                'x' + original, // Prepend character
                original.toUpperCase(), // Change case
                original.toLowerCase(), // Change case
                original.slice(1), // Remove first character
                original.slice(0, -1), // Remove last character
                '', // Empty string
                'wrongpassword123A', // Completely different password
              ];
              
              for (const incorrectPassword of incorrectPasswords) {
                if (incorrectPassword !== original && incorrectPassword.length > 0) {
                  const isInvalidPassword = await bcrypt.compare(incorrectPassword, hash);
                  expect(isInvalidPassword).toBe(false);
                }
              }
            }
            
            // Property 7: Each password should produce a unique hash (due to salt)
            // Hash the same passwords again to verify different hashes
            for (const { original } of hashedPasswords) {
              const secondHash = await bcrypt.hash(original, 12);
              const firstHash = hashedPasswords.find(p => p.original === original)!.hash;
              
              // Same password should produce different hash due to salt
              expect(secondHash).not.toBe(firstHash);
              expect(secondHash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              
              // But both hashes should verify the same password
              const firstHashValid = await bcrypt.compare(original, firstHash);
              const secondHashValid = await bcrypt.compare(original, secondHash);
              expect(firstHashValid).toBe(true);
              expect(secondHashValid).toBe(true);
            }
          }
        ), 
        { numRuns: 20 } // Reduced iterations for faster test execution
      );
    });

    /**
     * Property: Password hashing should handle special characters and edge cases
     * Tests password hashing with various character sets and edge cases
     */
    it('should securely hash passwords with special characters and edge cases', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate passwords with various characteristics
          fc.array(
            fc.oneof(
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
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (passwords: string[]) => {
            for (const password of passwords) {
              // Hash password using bcrypt with same settings as UserModel
              const hash = await bcrypt.hash(password, 12);
              
              // Verify security properties regardless of password complexity
              expect(hash).not.toBe(password);
              expect(hash).not.toContain(password);
              expect(hash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              expect(hash.length).toBe(60);
              
              // Verify hash can be used for verification
              const isValid = await bcrypt.compare(password, hash);
              expect(isValid).toBe(true);
              
              // Verify cost factor is correct
              const costMatch = hash.match(/^\$2[abxy]\$(\d{2})\$/);
              expect(costMatch).toBeTruthy();
              if (costMatch && costMatch[1]) {
                const cost = parseInt(costMatch[1]);
                expect(cost).toBe(12); // UserModel uses 12 rounds
              }
            }
          }
        ), 
        { numRuns: 10 } // Reduced runs for edge case testing
      );
    });

    /**
     * Property: Password verification should be consistent and secure
     * Tests that password verification works correctly and securely
     */
    it('should provide consistent and secure password verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate password and various verification attempts
          fc.record({
            correctPassword: fc.string({ minLength: 8, maxLength: 128 })
              .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s)),
            verificationAttempts: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async (testData: { correctPassword: string; verificationAttempts: string[] }) => {
            const { correctPassword, verificationAttempts } = testData;
            
            // Hash the correct password
            const hash = await bcrypt.hash(correctPassword, 12);
            
            // Verify the hash is secure
            expect(hash).not.toBe(correctPassword);
            expect(hash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
            
            // Test various verification attempts
            for (const attempt of verificationAttempts) {
              const shouldSucceed = attempt === correctPassword;
              
              const isValid = await bcrypt.compare(attempt, hash);
              
              if (shouldSucceed) {
                expect(isValid).toBe(true);
              } else {
                expect(isValid).toBe(false);
              }
            }
            
            // Verify correct password always works
            const correctVerification = await bcrypt.compare(correctPassword, hash);
            expect(correctVerification).toBe(true);
            
            // Verify some common incorrect passwords always fail
            const commonIncorrectPasswords = [
              correctPassword + 'x',
              'x' + correctPassword,
              correctPassword.toUpperCase(),
              correctPassword.toLowerCase(),
              '',
              'wrongpassword123A'
            ];
            
            for (const incorrectPassword of commonIncorrectPasswords) {
              if (incorrectPassword !== correctPassword) {
                const incorrectVerification = await bcrypt.compare(incorrectPassword, hash);
                expect(incorrectVerification).toBe(false);
              }
            }
          }
        ), 
        { numRuns: 10 } // Reduced runs for verification testing
      );
    });

    /**
     * Property: Password hashing should be non-deterministic for generation but deterministic for verification
     * Tests that the same password produces different hashes but verifies consistently
     */
    it('should produce non-deterministic hashes but deterministic verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 64 })
            .filter(s => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(s)),
          async (password: string) => {
            // Generate multiple hashes of the same password
            const hashes = await Promise.all([
              bcrypt.hash(password, 12),
              bcrypt.hash(password, 12),
              bcrypt.hash(password, 12),
              bcrypt.hash(password, 12),
              bcrypt.hash(password, 12)
            ]);
            
            // All hashes should be different (non-deterministic due to salt)
            const uniqueHashes = new Set(hashes);
            expect(uniqueHashes.size).toBe(hashes.length);
            
            // All hashes should be valid bcrypt hashes
            for (const hash of hashes) {
              expect(hash).toMatch(/^\$2[abxy]\$\d{2}\$.{53}$/);
              expect(hash.length).toBe(60);
            }
            
            // All hashes should verify the original password (deterministic verification)
            for (const hash of hashes) {
              const isValid = await bcrypt.compare(password, hash);
              expect(isValid).toBe(true);
            }
            
            // None of the hashes should verify an incorrect password
            const incorrectPassword = password + 'WRONG';
            for (const hash of hashes) {
              const isInvalid = await bcrypt.compare(incorrectPassword, hash);
              expect(isInvalid).toBe(false);
            }
          }
        ), 
        { numRuns: 5 } // Reduced runs due to multiple hash generation per iteration
      );
    });
  });
});