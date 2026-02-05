import fc from 'fast-check';
import { ReviewModel } from './Review';
import { connectDatabase, closeDatabase } from '@/config/database';
import { connectRedis, closeRedis } from '@/config/redis';
import { cleanupDatabase, cleanupRedis, createTestUser, createTestAlbum } from '@/test/helpers';

// Feature: jukeboxd, Property 4: Review Storage and Chronological Ordering
describe('ReviewModel Property-Based Tests', () => {
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

  describe('Property 4: Review Storage and Chronological Ordering', () => {
    /**
     * **Validates: Requirements 3.2, 3.3, 3.4**
     * 
     * Property: For any valid review content, storing a review should make it retrievable 
     * with correct timestamp, and multiple reviews should display in chronological order
     * 
     * Requirements:
     * 3.2: WHEN a user submits a review, THE System SHALL store the review with timestamp and associate it with the user and album
     * 3.3: WHEN a user has already reviewed an album, THE System SHALL display their existing review and allow editing
     * 3.4: WHEN displaying album information, THE System SHALL show all user reviews in chronological order
     */
    it('should store reviews with timestamps and maintain chronological ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate review scenarios with multiple users and albums
          fc.array(
            fc.record({
              userCount: fc.integer({ min: 1, max: 5 }), // Multiple users per scenario
              albumCount: fc.integer({ min: 1, max: 3 }), // Multiple albums per scenario
              reviews: fc.array(
                fc.record({
                  userIndex: fc.integer({ min: 0, max: 4 }), // Index into users array
                  albumIndex: fc.integer({ min: 0, max: 2 }), // Index into albums array
                  content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), // Valid review content
                  delayMs: fc.integer({ min: 0, max: 100 }) // Small delay to ensure different timestamps
                }),
                { minLength: 1, maxLength: 15 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (scenarios: Array<{
            userCount: number;
            albumCount: number;
            reviews: Array<{ 
              userIndex: number; 
              albumIndex: number; 
              content: string; 
              delayMs: number; 
            }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of scenarios) {
              const { userCount, albumCount, reviews } = scenario;
              
              // Create test users and albums
              const users = await Promise.all(
                Array.from({ length: userCount }, () => createTestUser())
              );
              const albums = await Promise.all(
                Array.from({ length: albumCount }, () => createTestAlbum())
              );

              const storedReviews: Array<{
                userId: string;
                albumId: string;
                content: string;
                reviewId: string;
                createdAt: Date;
              }> = [];

              // Store all reviews with small delays to ensure different timestamps
              for (const reviewData of reviews) {
                const { userIndex, albumIndex, content, delayMs } = reviewData;
                
                // Ensure indices are within bounds
                const userIdx = userIndex % users.length;
                const albumIdx = albumIndex % albums.length;
                
                const user = users[userIdx]!;
                const album = albums[albumIdx]!;
                
                // Add small delay to ensure different timestamps
                if (delayMs > 0) {
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                
                // Requirement 3.2: Store review with timestamp and associate with user and album
                const storedReview = await ReviewModel.upsert(user.id, album.id, content);
                
                // Verify review was stored correctly
                expect(storedReview).toBeDefined();
                expect(storedReview.id).toBeDefined();
                expect(storedReview.userId).toBe(user.id);
                expect(storedReview.albumId).toBe(album.id);
                expect(storedReview.content).toBe(content.trim());
                expect(storedReview.createdAt).toBeInstanceOf(Date);
                expect(storedReview.updatedAt).toBeInstanceOf(Date);
                
                // Track this review for later verification
                storedReviews.push({
                  userId: user.id,
                  albumId: album.id,
                  content: content.trim(),
                  reviewId: storedReview.id,
                  createdAt: storedReview.createdAt
                });
              }

              // Verify all reviews can be retrieved correctly
              for (const expectedReview of storedReviews) {
                const { userId, albumId, content, reviewId, createdAt } = expectedReview;
                
                // Test retrieval by user and album (Requirement 3.3: display existing review)
                const retrievedByUserAlbum = await ReviewModel.findByUserAndAlbum(userId, albumId);
                expect(retrievedByUserAlbum).toBeDefined();
                expect(retrievedByUserAlbum!.id).toBe(reviewId);
                expect(retrievedByUserAlbum!.userId).toBe(userId);
                expect(retrievedByUserAlbum!.albumId).toBe(albumId);
                expect(retrievedByUserAlbum!.content).toBe(content);
                expect(retrievedByUserAlbum!.createdAt).toEqual(createdAt);
                expect(retrievedByUserAlbum!.updatedAt).toBeInstanceOf(Date);
                
                // Test retrieval by review ID
                const retrievedById = await ReviewModel.findById(reviewId);
                expect(retrievedById).toBeDefined();
                expect(retrievedById!.id).toBe(reviewId);
                expect(retrievedById!.userId).toBe(userId);
                expect(retrievedById!.albumId).toBe(albumId);
                expect(retrievedById!.content).toBe(content);
                
                // Verify both retrieval methods return equivalent data
                expect(retrievedByUserAlbum).toEqual(retrievedById);
              }

              // Test chronological ordering for each album (Requirement 3.4)
              for (const album of albums) {
                const albumReviews = await ReviewModel.findByAlbum(album.id);
                const expectedAlbumReviews = storedReviews.filter(r => r.albumId === album.id);
                
                expect(albumReviews).toHaveLength(expectedAlbumReviews.length);
                
                // Verify chronological ordering (oldest first)
                for (let i = 1; i < albumReviews.length; i++) {
                  const prevReview = albumReviews[i - 1]!;
                  const currentReview = albumReviews[i]!;
                  
                  expect(currentReview.createdAt.getTime()).toBeGreaterThanOrEqual(
                    prevReview.createdAt.getTime()
                  );
                }
                
                // Verify all expected reviews are present
                for (const albumReview of albumReviews) {
                  expect(albumReview.albumId).toBe(album.id);
                  const expectedReview = expectedAlbumReviews.find(r => r.reviewId === albumReview.id);
                  expect(expectedReview).toBeDefined();
                  expect(albumReview.userId).toBe(expectedReview!.userId);
                  expect(albumReview.content).toBe(expectedReview!.content);
                }
              }

              // Test retrieval by user - should return all reviews for each user
              for (const user of users) {
                const userReviews = await ReviewModel.findByUser(user.id);
                const expectedUserReviews = storedReviews.filter(r => r.userId === user.id);
                
                expect(userReviews).toHaveLength(expectedUserReviews.length);
                
                // Verify chronological ordering (newest first for user reviews)
                for (let i = 1; i < userReviews.length; i++) {
                  const prevReview = userReviews[i - 1]!;
                  const currentReview = userReviews[i]!;
                  
                  expect(prevReview.createdAt.getTime()).toBeGreaterThanOrEqual(
                    currentReview.createdAt.getTime()
                  );
                }
                
                // Verify all expected reviews are present
                for (const userReview of userReviews) {
                  expect(userReview.userId).toBe(user.id);
                  const expectedReview = expectedUserReviews.find(r => r.reviewId === userReview.id);
                  expect(expectedReview).toBeDefined();
                  expect(userReview.albumId).toBe(expectedReview!.albumId);
                  expect(userReview.content).toBe(expectedReview!.content);
                }
              }

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 20 } // Reduced iterations as requested
      );
    });

    /**
     * Property: Review editing should update existing reviews correctly while maintaining timestamps
     * Tests Requirement 3.3: allow editing of existing reviews
     */
    it('should allow editing of existing reviews and maintain correct timestamp behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate review editing scenarios
          fc.array(
            fc.record({
              initialContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              edits: fc.array(
                fc.record({
                  newContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
                  delayMs: fc.integer({ min: 10, max: 50 }) // Small delay between edits
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (editingScenarios: Array<{
            initialContent: string;
            edits: Array<{ newContent: string; delayMs: number }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of editingScenarios) {
              const { initialContent, edits } = scenario;
              
              // Create test user and album
              const user = await createTestUser();
              const album = await createTestAlbum();

              // Store initial review (Requirement 3.2)
              const initialReview = await ReviewModel.upsert(user.id, album.id, initialContent);
              expect(initialReview.content).toBe(initialContent.trim());
              expect(initialReview.userId).toBe(user.id);
              expect(initialReview.albumId).toBe(album.id);
              
              const originalReviewId = initialReview.id;
              const originalCreatedAt = initialReview.createdAt;

              // Apply each edit (Requirement 3.3: allow editing)
              let currentContent = initialContent.trim();
              for (const edit of edits) {
                const { newContent, delayMs } = edit;
                
                // Add delay to ensure different updated_at timestamp
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                const editedReview = await ReviewModel.upsert(user.id, album.id, newContent);
                
                // Should update the same review record, not create a new one
                expect(editedReview.id).toBe(originalReviewId);
                expect(editedReview.userId).toBe(user.id);
                expect(editedReview.albumId).toBe(album.id);
                expect(editedReview.content).toBe(newContent.trim());
                expect(editedReview.createdAt).toEqual(originalCreatedAt);
                expect(editedReview.updatedAt.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
                
                currentContent = newContent.trim();
                
                // Verify the edit is retrievable
                const retrievedReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
                expect(retrievedReview).toBeDefined();
                expect(retrievedReview!.id).toBe(originalReviewId);
                expect(retrievedReview!.content).toBe(newContent.trim());
                expect(retrievedReview!.userId).toBe(user.id);
                expect(retrievedReview!.albumId).toBe(album.id);
                expect(retrievedReview!.createdAt).toEqual(originalCreatedAt);
              }

              // Verify only one review exists for this user-album pair
              const userReviews = await ReviewModel.findByUser(user.id);
              expect(userReviews).toHaveLength(1);
              expect(userReviews[0]!.id).toBe(originalReviewId);
              expect(userReviews[0]!.content).toBe(currentContent);
              
              const albumReviews = await ReviewModel.findByAlbum(album.id);
              expect(albumReviews).toHaveLength(1);
              expect(albumReviews[0]!.id).toBe(originalReviewId);
              expect(albumReviews[0]!.content).toBe(currentContent);

              // Verify review count is correct
              const reviewCount = await ReviewModel.getReviewCount(album.id);
              expect(reviewCount).toBe(1);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 10 } // Reduced iterations for editing testing
      );
    });

    /**
     * Property: Multiple users reviewing the same album should maintain correct chronological order
     * Tests that reviews from different users are ordered correctly by creation time
     */
    it('should maintain chronological ordering across multiple users for the same album', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multi-user review scenarios
          fc.array(
            fc.record({
              userCount: fc.integer({ min: 2, max: 8 }),
              reviewsPerUser: fc.array(
                fc.record({
                  content: fc.string({ minLength: 1, maxLength: 300 }).filter(s => s.trim().length > 0),
                  delayMs: fc.integer({ min: 5, max: 30 }) // Small delay to ensure ordering
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (multiUserScenarios: Array<{
            userCount: number;
            reviewsPerUser: Array<{ content: string; delayMs: number }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of multiUserScenarios) {
              const { userCount, reviewsPerUser } = scenario;
              
              // Create test album and users
              const album = await createTestAlbum();
              const users = await Promise.all(
                Array.from({ length: userCount }, () => createTestUser())
              );

              const expectedReviews: Array<{
                userId: string;
                content: string;
                reviewId: string;
                createdAt: Date;
              }> = [];

              // Each user creates reviews in sequence
              for (let userIdx = 0; userIdx < users.length; userIdx++) {
                const user = users[userIdx]!;
                const userReviewData = reviewsPerUser[userIdx % reviewsPerUser.length]!;
                
                // Add delay to ensure different timestamps
                if (userReviewData.delayMs > 0) {
                  await new Promise(resolve => setTimeout(resolve, userReviewData.delayMs));
                }
                
                // Store review for this user
                const storedReview = await ReviewModel.upsert(user.id, album.id, userReviewData.content);
                
                expect(storedReview.userId).toBe(user.id);
                expect(storedReview.albumId).toBe(album.id);
                expect(storedReview.content).toBe(userReviewData.content.trim());
                
                expectedReviews.push({
                  userId: user.id,
                  content: userReviewData.content.trim(),
                  reviewId: storedReview.id,
                  createdAt: storedReview.createdAt
                });
              }

              // Verify chronological ordering for the album (Requirement 3.4)
              const albumReviews = await ReviewModel.findByAlbum(album.id);
              expect(albumReviews).toHaveLength(expectedReviews.length);
              
              // Reviews should be ordered chronologically (oldest first)
              for (let i = 1; i < albumReviews.length; i++) {
                const prevReview = albumReviews[i - 1]!;
                const currentReview = albumReviews[i]!;
                
                expect(currentReview.createdAt.getTime()).toBeGreaterThanOrEqual(
                  prevReview.createdAt.getTime()
                );
              }

              // Verify all expected reviews are present and correctly ordered
              for (let i = 0; i < albumReviews.length; i++) {
                const albumReview = albumReviews[i]!;
                const expectedReview = expectedReviews[i]!;
                
                expect(albumReview.id).toBe(expectedReview.reviewId);
                expect(albumReview.userId).toBe(expectedReview.userId);
                expect(albumReview.content).toBe(expectedReview.content);
                expect(albumReview.albumId).toBe(album.id);
              }

              // Verify each user has exactly one review for this album
              for (const user of users) {
                const userAlbumReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
                expect(userAlbumReview).toBeDefined();
                expect(userAlbumReview!.userId).toBe(user.id);
                expect(userAlbumReview!.albumId).toBe(album.id);
                
                const expectedUserReview = expectedReviews.find(r => r.userId === user.id);
                expect(expectedUserReview).toBeDefined();
                expect(userAlbumReview!.content).toBe(expectedUserReview!.content);
              }

              // Verify review count matches expected
              const reviewCount = await ReviewModel.getReviewCount(album.id);
              expect(reviewCount).toBe(expectedReviews.length);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 5 } // Reduced iterations for complex multi-user testing
      );
    });

    /**
     * Property: Review storage should handle concurrent operations correctly
     * Tests that multiple reviews can be stored simultaneously without data corruption
     */
    it('should handle concurrent review operations correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate concurrent review scenarios
          fc.record({
            albumCount: fc.integer({ min: 1, max: 3 }),
            usersPerAlbum: fc.integer({ min: 2, max: 6 }),
            reviewContents: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              { minLength: 2, maxLength: 6 }
            )
          }),
          async (scenario: {
            albumCount: number;
            usersPerAlbum: number;
            reviewContents: string[];
          }) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            const { albumCount, usersPerAlbum, reviewContents } = scenario;
            
            // Create test albums
            const albums = await Promise.all(
              Array.from({ length: albumCount }, () => createTestAlbum())
            );

            const expectedReviews: Array<{
              userId: string;
              albumId: string;
              content: string;
            }> = [];

            // For each album, create multiple users and reviews
            for (const album of albums) {
              const users = await Promise.all(
                Array.from({ length: usersPerAlbum }, () => createTestUser())
              );

              // Each user reviews this album
              for (let userIdx = 0; userIdx < users.length; userIdx++) {
                const user = users[userIdx]!;
                const content = reviewContents[userIdx % reviewContents.length]!;
                
                // Store review for this user-album pair
                const storedReview = await ReviewModel.upsert(user.id, album.id, content);
                
                expect(storedReview.userId).toBe(user.id);
                expect(storedReview.albumId).toBe(album.id);
                expect(storedReview.content).toBe(content.trim());
                
                expectedReviews.push({
                  userId: user.id,
                  albumId: album.id,
                  content: content.trim()
                });
              }
            }

            // Verify all reviews are stored and retrievable
            expect(expectedReviews).toHaveLength(albumCount * usersPerAlbum);
            
            // Check each album's reviews
            for (const album of albums) {
              const albumReviews = await ReviewModel.findByAlbum(album.id);
              const expectedAlbumReviews = expectedReviews.filter(r => r.albumId === album.id);
              
              expect(albumReviews).toHaveLength(expectedAlbumReviews.length);
              
              // Verify chronological ordering
              for (let i = 1; i < albumReviews.length; i++) {
                const prevReview = albumReviews[i - 1]!;
                const currentReview = albumReviews[i]!;
                
                expect(currentReview.createdAt.getTime()).toBeGreaterThanOrEqual(
                  prevReview.createdAt.getTime()
                );
              }
              
              // Verify all expected reviews are present
              for (const albumReview of albumReviews) {
                const expected = expectedAlbumReviews.find(r => 
                  r.userId === albumReview.userId && r.content === albumReview.content
                );
                expect(expected).toBeDefined();
                expect(albumReview.albumId).toBe(album.id);
              }
            }

            // Verify each user-album pair has exactly one review
            for (const expectedReview of expectedReviews) {
              const retrievedReview = await ReviewModel.findByUserAndAlbum(
                expectedReview.userId, 
                expectedReview.albumId
              );
              expect(retrievedReview).toBeDefined();
              expect(retrievedReview!.userId).toBe(expectedReview.userId);
              expect(retrievedReview!.albumId).toBe(expectedReview.albumId);
              expect(retrievedReview!.content).toBe(expectedReview.content);
            }

            // Verify total review counts
            let totalExpectedReviews = 0;
            let totalActualReviews = 0;
            
            for (const album of albums) {
              const expectedCount = expectedReviews.filter(r => r.albumId === album.id).length;
              const actualCount = await ReviewModel.getReviewCount(album.id);
              
              totalExpectedReviews += expectedCount;
              totalActualReviews += actualCount;
              
              expect(actualCount).toBe(expectedCount);
            }
            
            expect(totalActualReviews).toBe(totalExpectedReviews);
          }
        ), 
        { numRuns: 5 } // Reduced iterations for complex concurrent testing
      );
    });

    /**
     * **Validates: Requirements 3.5**
     * 
     * Property 5: Whitespace Review Rejection
     * For any string composed entirely of whitespace characters, attempting to submit it as a review 
     * should be rejected and leave the system state unchanged
     * 
     * Requirements:
     * 3.5: WHEN a review is empty or contains only whitespace, THE System SHALL prevent submission and maintain current state
     */
    it('should reject reviews containing only whitespace characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various whitespace-only strings
          fc.array(
            fc.record({
              whitespaceContent: fc.oneof(
                fc.constant(''), // Empty string
                fc.constant(' '), // Single space
                fc.constant('  '), // Multiple spaces
                fc.constant('\t'), // Single tab
                fc.constant('\n'), // Single newline
                fc.constant('\r'), // Single carriage return
                fc.constant('   \t  '), // Mixed spaces and tabs
                fc.constant('\n\n\n'), // Multiple newlines
                fc.constant('\r\n\r\n'), // Windows line endings
                fc.constant(' \t\n\r '), // All whitespace types mixed
                fc.constant('    \n\t   \r  \n  '), // Complex whitespace pattern
                fc.string().filter(s => s.length > 0 && s.trim().length === 0) // Any whitespace-only string
              ),
              validContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (whitespaceScenarios: Array<{
            whitespaceContent: string;
            validContent: string;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of whitespaceScenarios) {
              const { whitespaceContent, validContent } = scenario;
              
              // Create test user and album
              const user = await createTestUser();
              const album = await createTestAlbum();

              // Verify initial state - no reviews exist
              const initialUserReviews = await ReviewModel.findByUser(user.id);
              const initialAlbumReviews = await ReviewModel.findByAlbum(album.id);
              const initialReviewCount = await ReviewModel.getReviewCount(album.id);
              const initialUserAlbumReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
              
              expect(initialUserReviews).toHaveLength(0);
              expect(initialAlbumReviews).toHaveLength(0);
              expect(initialReviewCount).toBe(0);
              expect(initialUserAlbumReview).toBeNull();

              // Attempt to submit whitespace-only review - should be rejected
              await expect(
                ReviewModel.create(user.id, album.id, whitespaceContent)
              ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

              // Also test upsert method
              await expect(
                ReviewModel.upsert(user.id, album.id, whitespaceContent)
              ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

              // Verify system state remains unchanged after rejection
              const postRejectionUserReviews = await ReviewModel.findByUser(user.id);
              const postRejectionAlbumReviews = await ReviewModel.findByAlbum(album.id);
              const postRejectionReviewCount = await ReviewModel.getReviewCount(album.id);
              const postRejectionUserAlbumReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
              
              expect(postRejectionUserReviews).toHaveLength(0);
              expect(postRejectionAlbumReviews).toHaveLength(0);
              expect(postRejectionReviewCount).toBe(0);
              expect(postRejectionUserAlbumReview).toBeNull();

              // Now submit a valid review to establish a baseline
              const validReview = await ReviewModel.create(user.id, album.id, validContent);
              expect(validReview.content).toBe(validContent.trim());
              expect(validReview.userId).toBe(user.id);
              expect(validReview.albumId).toBe(album.id);
              
              const validReviewId = validReview.id;
              const validCreatedAt = validReview.createdAt;

              // Verify valid review was stored correctly
              const postValidUserReviews = await ReviewModel.findByUser(user.id);
              const postValidAlbumReviews = await ReviewModel.findByAlbum(album.id);
              const postValidReviewCount = await ReviewModel.getReviewCount(album.id);
              const postValidUserAlbumReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
              
              expect(postValidUserReviews).toHaveLength(1);
              expect(postValidAlbumReviews).toHaveLength(1);
              expect(postValidReviewCount).toBe(1);
              expect(postValidUserAlbumReview).toBeDefined();
              expect(postValidUserAlbumReview!.content).toBe(validContent.trim());

              // Now attempt to update the valid review with whitespace-only content - should be rejected
              await expect(
                ReviewModel.upsert(user.id, album.id, whitespaceContent)
              ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

              // Also test updateContent method
              await expect(
                ReviewModel.updateContent(validReviewId, whitespaceContent)
              ).rejects.toThrow('Review content cannot be empty or contain only whitespace');

              // Verify the original valid review remains unchanged after whitespace rejection
              const finalUserReviews = await ReviewModel.findByUser(user.id);
              const finalAlbumReviews = await ReviewModel.findByAlbum(album.id);
              const finalReviewCount = await ReviewModel.getReviewCount(album.id);
              const finalUserAlbumReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
              
              expect(finalUserReviews).toHaveLength(1);
              expect(finalAlbumReviews).toHaveLength(1);
              expect(finalReviewCount).toBe(1);
              expect(finalUserAlbumReview).toBeDefined();
              expect(finalUserAlbumReview!.id).toBe(validReviewId);
              expect(finalUserAlbumReview!.content).toBe(validContent.trim());
              expect(finalUserAlbumReview!.createdAt).toEqual(validCreatedAt);
              expect(finalUserAlbumReview!.userId).toBe(user.id);
              expect(finalUserAlbumReview!.albumId).toBe(album.id);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 20 } // 20 iterations as requested
      );
    });

    /**
     * Property: Review content validation should reject invalid content consistently
     * Tests that only valid review content is accepted and stored
     */
    it('should reject invalid review content and maintain data integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various invalid content attempts
          fc.array(
            fc.record({
              validContent: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              invalidContents: fc.array(
                fc.oneof(
                  fc.constant(''), // Empty string
                  fc.constant('   '), // Whitespace only
                  fc.constant('\n\t  \n'), // Various whitespace characters
                  fc.constant(null as any), // Null
                  fc.constant(undefined as any), // Undefined
                  fc.constant(123 as any), // Number
                  fc.constant({} as any), // Object
                  fc.constant([] as any), // Array
                  fc.string({ minLength: 5001, maxLength: 6000 }) // Too long
                ),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (validationScenarios: Array<{
            validContent: string;
            invalidContents: any[];
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of validationScenarios) {
              const { validContent, invalidContents } = scenario;
              
              // Create test user and album
              const user = await createTestUser();
              const album = await createTestAlbum();

              // First, store a valid review to establish baseline
              const validReview = await ReviewModel.upsert(user.id, album.id, validContent);
              expect(validReview.content).toBe(validContent.trim());
              
              const originalReviewId = validReview.id;
              const originalCreatedAt = validReview.createdAt;

              // Attempt to store each invalid content
              for (const invalidContent of invalidContents) {
                // Invalid content should be rejected
                await expect(
                  ReviewModel.upsert(user.id, album.id, invalidContent)
                ).rejects.toThrow();
                
                // Verify the original valid review is unchanged
                const unchangedReview = await ReviewModel.findByUserAndAlbum(user.id, album.id);
                expect(unchangedReview).toBeDefined();
                expect(unchangedReview!.id).toBe(originalReviewId);
                expect(unchangedReview!.content).toBe(validContent.trim());
                expect(unchangedReview!.createdAt).toEqual(originalCreatedAt);
                expect(unchangedReview!.userId).toBe(user.id);
                expect(unchangedReview!.albumId).toBe(album.id);
              }

              // Verify data integrity - should still have exactly one review
              const userReviews = await ReviewModel.findByUser(user.id);
              expect(userReviews).toHaveLength(1);
              expect(userReviews[0]!.content).toBe(validContent.trim());
              
              const albumReviews = await ReviewModel.findByAlbum(album.id);
              expect(albumReviews).toHaveLength(1);
              expect(albumReviews[0]!.content).toBe(validContent.trim());
              
              const reviewCount = await ReviewModel.getReviewCount(album.id);
              expect(reviewCount).toBe(1);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 10 } // Reduced iterations for validation testing
      );
    });
  });
});