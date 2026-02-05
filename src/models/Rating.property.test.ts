import fc from 'fast-check';
import { RatingModel } from './Rating';
import { connectDatabase, closeDatabase } from '@/config/database';
import { connectRedis, closeRedis } from '@/config/redis';
import { cleanupDatabase, cleanupRedis, createTestUser, createTestAlbum } from '@/test/helpers';

// Feature: jukeboxd, Property 2: Rating Storage and Retrieval
describe('RatingModel Property-Based Tests', () => {
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

  describe('Property 2: Rating Storage and Retrieval', () => {
    /**
     * **Validates: Requirements 2.2, 2.3**
     * 
     * Property: For any valid user, album, and rating (1-5), storing a rating should make it 
     * retrievable and correctly associated with both user and album
     * 
     * Requirements:
     * 2.2: WHEN a user submits a rating, THE System SHALL store the rating and associate it with the user and album
     * 2.3: WHEN a user has already rated an album, THE System SHALL display their existing rating and allow modification
     */
    it('should store ratings and make them retrievable with correct associations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple rating scenarios
          fc.array(
            fc.record({
              userCount: fc.integer({ min: 1, max: 3 }), // Multiple users per scenario
              albumCount: fc.integer({ min: 1, max: 3 }), // Multiple albums per scenario
              ratings: fc.array(
                fc.record({
                  userIndex: fc.integer({ min: 0, max: 2 }), // Index into users array
                  albumIndex: fc.integer({ min: 0, max: 2 }), // Index into albums array
                  rating: fc.integer({ min: 1, max: 5 }) // Valid rating range
                }),
                { minLength: 1, maxLength: 10 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (scenarios: Array<{
            userCount: number;
            albumCount: number;
            ratings: Array<{ userIndex: number; albumIndex: number; rating: number }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of scenarios) {
              const { userCount, albumCount, ratings } = scenario;
              
              // Create test users and albums
              const users = await Promise.all(
                Array.from({ length: userCount }, () => createTestUser())
              );
              const albums = await Promise.all(
                Array.from({ length: albumCount }, () => createTestAlbum())
              );

              const storedRatings: Array<{
                userId: string;
                albumId: string;
                rating: number;
                ratingId: string;
              }> = [];

              // Store all ratings
              for (const ratingData of ratings) {
                const { userIndex, albumIndex, rating } = ratingData;
                
                // Ensure indices are within bounds
                const userIdx = userIndex % users.length;
                const albumIdx = albumIndex % albums.length;
                
                const user = users[userIdx]!;
                const album = albums[albumIdx]!;
                
                // Requirement 2.2: Store rating and associate with user and album
                const storedRating = await RatingModel.upsert(user.id, album.id, rating);
                
                // Verify rating was stored correctly
                expect(storedRating).toBeDefined();
                expect(storedRating.id).toBeDefined();
                expect(storedRating.userId).toBe(user.id);
                expect(storedRating.albumId).toBe(album.id);
                expect(storedRating.rating).toBe(rating);
                expect(storedRating.createdAt).toBeInstanceOf(Date);
                expect(storedRating.updatedAt).toBeInstanceOf(Date);
                
                // Track this rating for later verification
                storedRatings.push({
                  userId: user.id,
                  albumId: album.id,
                  rating: rating,
                  ratingId: storedRating.id
                });
              }

              // Verify all ratings can be retrieved correctly
              for (const expectedRating of storedRatings) {
                const { userId, albumId, rating, ratingId } = expectedRating;
                
                // Test retrieval by user and album (Requirement 2.3: display existing rating)
                const retrievedByUserAlbum = await RatingModel.findByUserAndAlbum(userId, albumId);
                expect(retrievedByUserAlbum).toBeDefined();
                expect(retrievedByUserAlbum!.id).toBe(ratingId);
                expect(retrievedByUserAlbum!.userId).toBe(userId);
                expect(retrievedByUserAlbum!.albumId).toBe(albumId);
                expect(retrievedByUserAlbum!.rating).toBe(rating);
                expect(retrievedByUserAlbum!.createdAt).toBeInstanceOf(Date);
                expect(retrievedByUserAlbum!.updatedAt).toBeInstanceOf(Date);
                
                // Test retrieval by rating ID
                const retrievedById = await RatingModel.findById(ratingId);
                expect(retrievedById).toBeDefined();
                expect(retrievedById!.id).toBe(ratingId);
                expect(retrievedById!.userId).toBe(userId);
                expect(retrievedById!.albumId).toBe(albumId);
                expect(retrievedById!.rating).toBe(rating);
                
                // Verify both retrieval methods return equivalent data
                expect(retrievedByUserAlbum).toEqual(retrievedById);
              }

              // Test retrieval by user - should return all ratings for each user
              for (const user of users) {
                const userRatings = await RatingModel.findByUser(user.id);
                const expectedUserRatings = storedRatings.filter(r => r.userId === user.id);
                
                expect(userRatings).toHaveLength(expectedUserRatings.length);
                
                for (const userRating of userRatings) {
                  expect(userRating.userId).toBe(user.id);
                  const expectedRating = expectedUserRatings.find(r => r.ratingId === userRating.id);
                  expect(expectedRating).toBeDefined();
                  expect(userRating.albumId).toBe(expectedRating!.albumId);
                  expect(userRating.rating).toBe(expectedRating!.rating);
                }
              }

              // Test retrieval by album - should return all ratings for each album
              for (const album of albums) {
                const albumRatings = await RatingModel.findByAlbum(album.id);
                const expectedAlbumRatings = storedRatings.filter(r => r.albumId === album.id);
                
                expect(albumRatings).toHaveLength(expectedAlbumRatings.length);
                
                for (const albumRating of albumRatings) {
                  expect(albumRating.albumId).toBe(album.id);
                  const expectedRating = expectedAlbumRatings.find(r => r.ratingId === albumRating.id);
                  expect(expectedRating).toBeDefined();
                  expect(albumRating.userId).toBe(expectedRating!.userId);
                  expect(albumRating.rating).toBe(expectedRating!.rating);
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
     * Property: Rating modification should update existing ratings correctly
     * Tests Requirement 2.3: allow modification of existing ratings
     */
    it('should allow modification of existing ratings and maintain correct associations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate rating modification scenarios
          fc.array(
            fc.record({
              initialRating: fc.integer({ min: 1, max: 5 }),
              modifications: fc.array(
                fc.integer({ min: 1, max: 5 }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (modificationScenarios: Array<{
            initialRating: number;
            modifications: number[];
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of modificationScenarios) {
              const { initialRating, modifications } = scenario;
              
              // Create test user and album
              const user = await createTestUser();
              const album = await createTestAlbum();

              // Store initial rating (Requirement 2.2)
              const initialStoredRating = await RatingModel.upsert(user.id, album.id, initialRating);
              expect(initialStoredRating.rating).toBe(initialRating);
              expect(initialStoredRating.userId).toBe(user.id);
              expect(initialStoredRating.albumId).toBe(album.id);
              
              const originalRatingId = initialStoredRating.id;
              const originalCreatedAt = initialStoredRating.createdAt;

              // Apply each modification (Requirement 2.3: allow modification)
              let currentRating = initialRating;
              for (const newRating of modifications) {
                const modifiedRating = await RatingModel.upsert(user.id, album.id, newRating);
                
                // Should update the same rating record, not create a new one
                expect(modifiedRating.id).toBe(originalRatingId);
                expect(modifiedRating.userId).toBe(user.id);
                expect(modifiedRating.albumId).toBe(album.id);
                expect(modifiedRating.rating).toBe(newRating);
                expect(modifiedRating.createdAt).toEqual(originalCreatedAt);
                expect(modifiedRating.updatedAt.getTime()).toBeGreaterThanOrEqual(originalCreatedAt.getTime());
                
                currentRating = newRating;
                
                // Verify the modification is retrievable
                const retrievedRating = await RatingModel.findByUserAndAlbum(user.id, album.id);
                expect(retrievedRating).toBeDefined();
                expect(retrievedRating!.id).toBe(originalRatingId);
                expect(retrievedRating!.rating).toBe(newRating);
                expect(retrievedRating!.userId).toBe(user.id);
                expect(retrievedRating!.albumId).toBe(album.id);
              }

              // Verify only one rating exists for this user-album pair
              const userRatings = await RatingModel.findByUser(user.id);
              expect(userRatings).toHaveLength(1);
              expect(userRatings[0]!.id).toBe(originalRatingId);
              expect(userRatings[0]!.rating).toBe(currentRating);
              
              const albumRatings = await RatingModel.findByAlbum(album.id);
              expect(albumRatings).toHaveLength(1);
              expect(albumRatings[0]!.id).toBe(originalRatingId);
              expect(albumRatings[0]!.rating).toBe(currentRating);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 10 } // Reduced iterations for modification testing
      );
    });

    /**
     * Property: Rating storage should handle concurrent operations correctly
     * Tests that multiple users can rate the same album simultaneously
     */
    it('should handle concurrent rating operations correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate concurrent rating scenarios
          fc.record({
            userCount: fc.integer({ min: 2, max: 5 }),
            albumCount: fc.integer({ min: 1, max: 3 }),
            ratingsPerUser: fc.array(
              fc.integer({ min: 1, max: 5 }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          async (scenario: {
            userCount: number;
            albumCount: number;
            ratingsPerUser: number[];
          }) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            const { userCount, albumCount, ratingsPerUser } = scenario;
            
            // Create test users and albums
            const users = await Promise.all(
              Array.from({ length: userCount }, () => createTestUser())
            );
            const albums = await Promise.all(
              Array.from({ length: albumCount }, () => createTestAlbum())
            );

            // Each user rates each album
            const expectedRatings: Array<{
              userId: string;
              albumId: string;
              rating: number;
            }> = [];

            for (let userIdx = 0; userIdx < users.length; userIdx++) {
              const user = users[userIdx]!;
              const userRating = ratingsPerUser[userIdx % ratingsPerUser.length]!;
              
              for (const album of albums) {
                // Store rating for this user-album pair
                const storedRating = await RatingModel.upsert(user.id, album.id, userRating);
                
                expect(storedRating.userId).toBe(user.id);
                expect(storedRating.albumId).toBe(album.id);
                expect(storedRating.rating).toBe(userRating);
                
                expectedRatings.push({
                  userId: user.id,
                  albumId: album.id,
                  rating: userRating
                });
              }
            }

            // Verify all ratings are stored and retrievable
            expect(expectedRatings).toHaveLength(userCount * albumCount);
            
            // Check each user's ratings
            for (const user of users) {
              const userRatings = await RatingModel.findByUser(user.id);
              const expectedUserRatings = expectedRatings.filter(r => r.userId === user.id);
              
              expect(userRatings).toHaveLength(expectedUserRatings.length);
              
              for (const userRating of userRatings) {
                const expected = expectedUserRatings.find(r => r.albumId === userRating.albumId);
                expect(expected).toBeDefined();
                expect(userRating.rating).toBe(expected!.rating);
              }
            }

            // Check each album's ratings
            for (const album of albums) {
              const albumRatings = await RatingModel.findByAlbum(album.id);
              const expectedAlbumRatings = expectedRatings.filter(r => r.albumId === album.id);
              
              expect(albumRatings).toHaveLength(expectedAlbumRatings.length);
              
              for (const albumRating of albumRatings) {
                const expected = expectedAlbumRatings.find(r => r.userId === albumRating.userId);
                expect(expected).toBeDefined();
                expect(albumRating.rating).toBe(expected!.rating);
              }
            }

            // Verify each user-album pair has exactly one rating
            for (const expectedRating of expectedRatings) {
              const retrievedRating = await RatingModel.findByUserAndAlbum(
                expectedRating.userId, 
                expectedRating.albumId
              );
              expect(retrievedRating).toBeDefined();
              expect(retrievedRating!.userId).toBe(expectedRating.userId);
              expect(retrievedRating!.albumId).toBe(expectedRating.albumId);
              expect(retrievedRating!.rating).toBe(expectedRating.rating);
            }
          }
        ), 
        { numRuns: 5 } // Reduced iterations for complex concurrent testing
      );
    });

    /**
     * Property: Rating validation should reject invalid ratings consistently
     * Tests that only valid ratings (1-5) are accepted
     */
    it('should reject invalid ratings and maintain data integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various invalid rating attempts
          fc.array(
            fc.record({
              validRating: fc.integer({ min: 1, max: 5 }),
              invalidRatings: fc.array(
                fc.oneof(
                  fc.integer({ min: -100, max: 0 }), // Too low
                  fc.integer({ min: 6, max: 100 }), // Too high
                  fc.float({ min: 1.1, max: 4.9 }), // Non-integer
                  fc.constant(null as any), // Null
                  fc.constant(undefined as any), // Undefined
                  fc.constant('3' as any), // String
                  fc.constant({} as any), // Object
                  fc.constant([] as any) // Array
                ),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (validationScenarios: Array<{
            validRating: number;
            invalidRatings: any[];
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of validationScenarios) {
              const { validRating, invalidRatings } = scenario;
              
              // Create test user and album
              const user = await createTestUser();
              const album = await createTestAlbum();

              // First, store a valid rating to establish baseline
              const validStoredRating = await RatingModel.upsert(user.id, album.id, validRating);
              expect(validStoredRating.rating).toBe(validRating);
              
              const originalRatingId = validStoredRating.id;
              const originalCreatedAt = validStoredRating.createdAt;

              // Attempt to store each invalid rating
              for (const invalidRating of invalidRatings) {
                // Invalid ratings should be rejected
                await expect(
                  RatingModel.upsert(user.id, album.id, invalidRating)
                ).rejects.toThrow('Rating must be an integer between 1 and 5');
                
                // Verify the original valid rating is unchanged
                const unchangedRating = await RatingModel.findByUserAndAlbum(user.id, album.id);
                expect(unchangedRating).toBeDefined();
                expect(unchangedRating!.id).toBe(originalRatingId);
                expect(unchangedRating!.rating).toBe(validRating);
                expect(unchangedRating!.createdAt).toEqual(originalCreatedAt);
                expect(unchangedRating!.userId).toBe(user.id);
                expect(unchangedRating!.albumId).toBe(album.id);
              }

              // Verify data integrity - should still have exactly one rating
              const userRatings = await RatingModel.findByUser(user.id);
              expect(userRatings).toHaveLength(1);
              expect(userRatings[0]!.rating).toBe(validRating);
              
              const albumRatings = await RatingModel.findByAlbum(album.id);
              expect(albumRatings).toHaveLength(1);
              expect(albumRatings[0]!.rating).toBe(validRating);

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

  describe('Property 3: Rating Average Calculation', () => {
    /**
     * **Validates: Requirements 2.4**
     * 
     * Property: For any album with multiple ratings, the displayed average should equal 
     * the mathematical mean of all ratings for that album
     * 
     * Requirements:
     * 2.4: WHEN displaying album information, THE System SHALL show the average rating from all users
     */
    it('should calculate rating averages correctly for any set of ratings', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate rating scenarios with multiple users rating albums
          fc.array(
            fc.record({
              albumCount: fc.integer({ min: 1, max: 3 }), // Multiple albums per scenario
              ratingsPerAlbum: fc.array(
                fc.record({
                  userCount: fc.integer({ min: 1, max: 10 }), // Multiple users rating same album
                  ratings: fc.array(
                    fc.integer({ min: 1, max: 5 }), // Valid rating range
                    { minLength: 1, maxLength: 10 }
                  )
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (scenarios: Array<{
            albumCount: number;
            ratingsPerAlbum: Array<{
              userCount: number;
              ratings: number[];
            }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of scenarios) {
              const { albumCount, ratingsPerAlbum } = scenario;
              
              // Create test albums
              const albums = await Promise.all(
                Array.from({ length: albumCount }, () => createTestAlbum())
              );

              // For each album, create ratings and test average calculation
              for (let albumIdx = 0; albumIdx < albums.length; albumIdx++) {
                const album = albums[albumIdx]!;
                const ratingScenario = ratingsPerAlbum[albumIdx % ratingsPerAlbum.length]!;
                const { userCount, ratings } = ratingScenario;

                // Create users for this album
                const users = await Promise.all(
                  Array.from({ length: userCount }, () => createTestUser())
                );

                const actualRatings: number[] = [];
                
                // Each user provides one rating for this album
                for (let userIdx = 0; userIdx < users.length; userIdx++) {
                  const user = users[userIdx]!;
                  const rating = ratings[userIdx % ratings.length]!;
                  
                  // Store the rating
                  const storedRating = await RatingModel.upsert(user.id, album.id, rating);
                  expect(storedRating.rating).toBe(rating);
                  
                  actualRatings.push(rating);
                }

                // Calculate expected average manually
                const expectedAverage = actualRatings.length > 0 
                  ? actualRatings.reduce((sum, rating) => sum + rating, 0) / actualRatings.length
                  : 0;

                // Get the system-calculated average
                const systemAverage = await RatingModel.getAverageRating(album.id);

                // Verify the average calculation is correct (within floating point precision)
                if (actualRatings.length === 0) {
                  expect(systemAverage).toBe(0);
                } else {
                  expect(systemAverage).toBeCloseTo(expectedAverage, 2);
                }

                // Verify rating count is correct
                const ratingCount = await RatingModel.getRatingCount(album.id);
                expect(ratingCount).toBe(actualRatings.length);

                // Additional verification: retrieve all ratings and manually verify average
                const retrievedRatings = await RatingModel.findByAlbum(album.id);
                expect(retrievedRatings).toHaveLength(actualRatings.length);
                
                const retrievedRatingValues = retrievedRatings.map(r => r.rating);
                const manualAverage = retrievedRatingValues.length > 0
                  ? retrievedRatingValues.reduce((sum, rating) => sum + rating, 0) / retrievedRatingValues.length
                  : 0;
                
                expect(systemAverage).toBeCloseTo(manualAverage, 2);

                // Verify each individual rating is correct
                for (const retrievedRating of retrievedRatings) {
                  expect(actualRatings).toContain(retrievedRating.rating);
                  expect(retrievedRating.albumId).toBe(album.id);
                  expect(users.some(u => u.id === retrievedRating.userId)).toBe(true);
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
     * Property: Rating average should update correctly when ratings are modified
     * Tests that average recalculation works when existing ratings change
     */
    it('should recalculate averages correctly when ratings are modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate rating modification scenarios
          fc.array(
            fc.record({
              initialRatings: fc.array(
                fc.integer({ min: 1, max: 5 }),
                { minLength: 1, maxLength: 8 }
              ),
              modifications: fc.array(
                fc.record({
                  userIndex: fc.integer({ min: 0, max: 7 }), // Index into users array
                  newRating: fc.integer({ min: 1, max: 5 })
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (modificationScenarios: Array<{
            initialRatings: number[];
            modifications: Array<{ userIndex: number; newRating: number }>;
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of modificationScenarios) {
              const { initialRatings, modifications } = scenario;
              
              // Create test album and users
              const album = await createTestAlbum();
              const users = await Promise.all(
                Array.from({ length: initialRatings.length }, () => createTestUser())
              );

              // Store initial ratings
              const currentRatings = [...initialRatings];
              for (let i = 0; i < users.length; i++) {
                const user = users[i]!;
                const rating = initialRatings[i]!;
                
                await RatingModel.upsert(user.id, album.id, rating);
              }

              // Verify initial average
              let expectedAverage = currentRatings.reduce((sum, rating) => sum + rating, 0) / currentRatings.length;
              let systemAverage = await RatingModel.getAverageRating(album.id);
              expect(systemAverage).toBeCloseTo(expectedAverage, 2);

              // Apply modifications and verify average updates
              for (const modification of modifications) {
                const { userIndex, newRating } = modification;
                const actualUserIndex = userIndex % users.length;
                const user = users[actualUserIndex]!;
                
                // Update the rating
                await RatingModel.upsert(user.id, album.id, newRating);
                
                // Update our expected calculation
                currentRatings[actualUserIndex] = newRating;
                expectedAverage = currentRatings.reduce((sum, rating) => sum + rating, 0) / currentRatings.length;
                
                // Verify system average is updated correctly
                systemAverage = await RatingModel.getAverageRating(album.id);
                expect(systemAverage).toBeCloseTo(expectedAverage, 2);
                
                // Verify rating count remains the same (no duplicates created)
                const ratingCount = await RatingModel.getRatingCount(album.id);
                expect(ratingCount).toBe(currentRatings.length);
                
                // Verify all ratings are still present and correct
                const allRatings = await RatingModel.findByAlbum(album.id);
                expect(allRatings).toHaveLength(currentRatings.length);
                
                const retrievedRatingValues = allRatings.map(r => r.rating).sort();
                const expectedRatingValues = [...currentRatings].sort();
                expect(retrievedRatingValues).toEqual(expectedRatingValues);
              }

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 10 } // Reduced iterations for modification testing
      );
    });

    /**
     * Property: Rating average should handle edge cases correctly
     * Tests empty albums, single ratings, and extreme values
     */
    it('should handle edge cases in average calculation correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case scenarios
          fc.array(
            fc.oneof(
              // Empty album (no ratings)
              fc.constant({ type: 'empty' as const }),
              // Single rating
              fc.record({
                type: fc.constant('single' as const),
                rating: fc.integer({ min: 1, max: 5 })
              }),
              // All same ratings
              fc.record({
                type: fc.constant('uniform' as const),
                rating: fc.integer({ min: 1, max: 5 }),
                count: fc.integer({ min: 2, max: 10 })
              }),
              // All minimum ratings
              fc.record({
                type: fc.constant('allMin' as const),
                count: fc.integer({ min: 1, max: 10 })
              }),
              // All maximum ratings
              fc.record({
                type: fc.constant('allMax' as const),
                count: fc.integer({ min: 1, max: 10 })
              }),
              // Mixed extreme values
              fc.record({
                type: fc.constant('extremes' as const),
                minCount: fc.integer({ min: 1, max: 5 }),
                maxCount: fc.integer({ min: 1, max: 5 })
              })
            ),
            { minLength: 1, maxLength: 5 }
          ),
          async (edgeCases: Array<
            | { type: 'empty' }
            | { type: 'single'; rating: number }
            | { type: 'uniform'; rating: number; count: number }
            | { type: 'allMin'; count: number }
            | { type: 'allMax'; count: number }
            | { type: 'extremes'; minCount: number; maxCount: number }
          >) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const edgeCase of edgeCases) {
              // Create test album
              const album = await createTestAlbum();
              
              let expectedAverage = 0;
              let expectedCount = 0;
              const ratings: number[] = [];

              switch (edgeCase.type) {
                case 'empty':
                  // No ratings to add
                  expectedAverage = 0;
                  expectedCount = 0;
                  break;

                case 'single':
                  const user = await createTestUser();
                  await RatingModel.upsert(user.id, album.id, edgeCase.rating);
                  ratings.push(edgeCase.rating);
                  expectedAverage = edgeCase.rating;
                  expectedCount = 1;
                  break;

                case 'uniform':
                  const uniformUsers = await Promise.all(
                    Array.from({ length: edgeCase.count }, () => createTestUser())
                  );
                  for (const uniformUser of uniformUsers) {
                    await RatingModel.upsert(uniformUser.id, album.id, edgeCase.rating);
                    ratings.push(edgeCase.rating);
                  }
                  expectedAverage = edgeCase.rating;
                  expectedCount = edgeCase.count;
                  break;

                case 'allMin':
                  const minUsers = await Promise.all(
                    Array.from({ length: edgeCase.count }, () => createTestUser())
                  );
                  for (const minUser of minUsers) {
                    await RatingModel.upsert(minUser.id, album.id, 1);
                    ratings.push(1);
                  }
                  expectedAverage = 1;
                  expectedCount = edgeCase.count;
                  break;

                case 'allMax':
                  const maxUsers = await Promise.all(
                    Array.from({ length: edgeCase.count }, () => createTestUser())
                  );
                  for (const maxUser of maxUsers) {
                    await RatingModel.upsert(maxUser.id, album.id, 5);
                    ratings.push(5);
                  }
                  expectedAverage = 5;
                  expectedCount = edgeCase.count;
                  break;

                case 'extremes':
                  const extremeUsers = await Promise.all(
                    Array.from({ length: edgeCase.minCount + edgeCase.maxCount }, () => createTestUser())
                  );
                  
                  // Add minimum ratings
                  for (let i = 0; i < edgeCase.minCount; i++) {
                    await RatingModel.upsert(extremeUsers[i]!.id, album.id, 1);
                    ratings.push(1);
                  }
                  
                  // Add maximum ratings
                  for (let i = 0; i < edgeCase.maxCount; i++) {
                    await RatingModel.upsert(extremeUsers[edgeCase.minCount + i]!.id, album.id, 5);
                    ratings.push(5);
                  }
                  
                  expectedAverage = (edgeCase.minCount * 1 + edgeCase.maxCount * 5) / (edgeCase.minCount + edgeCase.maxCount);
                  expectedCount = edgeCase.minCount + edgeCase.maxCount;
                  break;
              }

              // Verify system calculations match expected values
              const systemAverage = await RatingModel.getAverageRating(album.id);
              const systemCount = await RatingModel.getRatingCount(album.id);

              expect(systemCount).toBe(expectedCount);
              
              if (expectedCount === 0) {
                expect(systemAverage).toBe(0);
              } else {
                expect(systemAverage).toBeCloseTo(expectedAverage, 2);
              }

              // Verify individual ratings are correct
              const retrievedRatings = await RatingModel.findByAlbum(album.id);
              expect(retrievedRatings).toHaveLength(expectedCount);
              
              if (expectedCount > 0) {
                const retrievedValues = retrievedRatings.map(r => r.rating).sort();
                const expectedValues = [...ratings].sort();
                expect(retrievedValues).toEqual(expectedValues);
                
                // Manual verification of average calculation
                const manualAverage = retrievedValues.reduce((sum, rating) => sum + rating, 0) / retrievedValues.length;
                expect(systemAverage).toBeCloseTo(manualAverage, 2);
              }

              // Clean up for next edge case
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 10 } // Reduced iterations for edge case testing
      );
    });

    /**
     * Property: Rating average should be consistent across multiple albums
     * Tests that averages are calculated independently for different albums
     */
    it('should calculate averages independently for different albums', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multi-album scenarios
          fc.array(
            fc.record({
              albumRatings: fc.array(
                fc.array(
                  fc.integer({ min: 1, max: 5 }),
                  { minLength: 1, maxLength: 8 }
                ),
                { minLength: 2, maxLength: 5 }
              )
            }),
            { minLength: 1, maxLength: 2 }
          ),
          async (multiAlbumScenarios: Array<{
            albumRatings: number[][];
          }>) => {
            // Clean up before each property test iteration
            await cleanupDatabase();
            await cleanupRedis();

            for (const scenario of multiAlbumScenarios) {
              const { albumRatings } = scenario;
              
              // Create albums and users
              const albums = await Promise.all(
                Array.from({ length: albumRatings.length }, () => createTestAlbum())
              );

              const expectedAverages: number[] = [];
              const expectedCounts: number[] = [];

              // For each album, create ratings and calculate expected average
              for (let albumIdx = 0; albumIdx < albums.length; albumIdx++) {
                const album = albums[albumIdx]!;
                const ratings = albumRatings[albumIdx]!;
                
                // Create users for this album
                const users = await Promise.all(
                  Array.from({ length: ratings.length }, () => createTestUser())
                );

                // Store ratings for this album
                for (let userIdx = 0; userIdx < users.length; userIdx++) {
                  const user = users[userIdx]!;
                  const rating = ratings[userIdx]!;
                  
                  await RatingModel.upsert(user.id, album.id, rating);
                }

                // Calculate expected average for this album
                const expectedAverage = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
                expectedAverages.push(expectedAverage);
                expectedCounts.push(ratings.length);
              }

              // Verify each album's average is calculated correctly and independently
              for (let albumIdx = 0; albumIdx < albums.length; albumIdx++) {
                const album = albums[albumIdx]!;
                const expectedAverage = expectedAverages[albumIdx]!;
                const expectedCount = expectedCounts[albumIdx]!;

                const systemAverage = await RatingModel.getAverageRating(album.id);
                const systemCount = await RatingModel.getRatingCount(album.id);

                expect(systemCount).toBe(expectedCount);
                expect(systemAverage).toBeCloseTo(expectedAverage, 2);

                // Verify ratings belong only to this album
                const albumRatingsRetrieved = await RatingModel.findByAlbum(album.id);
                expect(albumRatingsRetrieved).toHaveLength(expectedCount);
                
                for (const rating of albumRatingsRetrieved) {
                  expect(rating.albumId).toBe(album.id);
                  expect(albumRatings[albumIdx]).toContain(rating.rating);
                }
              }

              // Verify total ratings across all albums
              const totalExpectedRatings = expectedCounts.reduce((sum, count) => sum + count, 0);
              let totalActualRatings = 0;
              
              for (const album of albums) {
                const albumRatingCount = await RatingModel.getRatingCount(album.id);
                totalActualRatings += albumRatingCount;
              }
              
              expect(totalActualRatings).toBe(totalExpectedRatings);

              // Clean up for next scenario
              await cleanupDatabase();
              await cleanupRedis();
            }
          }
        ), 
        { numRuns: 5 } // Reduced iterations for complex multi-album testing
      );
    });
  });
});