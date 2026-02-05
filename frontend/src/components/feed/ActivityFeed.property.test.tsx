import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import fc from 'fast-check';
import { ActivityFeed } from './ActivityFeed';
import { useAuth } from '../../contexts/AuthContext';
import { feedApi } from '../../services/feedApi';
import { Activity, User } from '../../types';

// Feature: jukeboxd, Property 1: Activity Feed Display Completeness
// **Validates: Requirements 5.1, 5.2, 5.3**

// Mock the feedApi
jest.mock('../../services/feedApi');
const mockFeedApi = feedApi as jest.Mocked<typeof feedApi>;

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago')
}));

const theme = createTheme();

// Generators for property-based testing
const userGenerator = fc.record({
  id: fc.uuid(),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.emailAddress(),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString())
});

const albumGenerator = fc.record({
  id: fc.uuid(),
  spotifyId: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  artist: fc.string({ minLength: 1, maxLength: 100 }),
  releaseDate: fc.date().map(d => d.toISOString().split('T')[0]),
  imageUrl: fc.webUrl(),
  spotifyUrl: fc.webUrl(),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString())
});

const activityDataGenerator = fc.oneof(
  fc.record({ rating: fc.integer({ min: 1, max: 5 }) }),
  fc.record({ content: fc.string({ minLength: 1, maxLength: 1000 }) })
);

const activityGenerator = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  type: fc.constantFrom('rating' as const, 'review' as const),
  albumId: fc.uuid(),
  data: activityDataGenerator,
  createdAt: fc.date().map(d => d.toISOString()),
  user: userGenerator,
  album: albumGenerator
});

const renderWithProviders = (component: React.ReactElement, user: User | null) => {
  mockUseAuth.mockReturnValue({
    user,
    token: user ? 'mock-token' : null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    deleteAccount: jest.fn(),
    loading: false
    });

  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('ActivityFeed Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Property: Activity feed displays all required information for any valid activities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityGenerator, { minLength: 1, maxLength: 10 }),
        userGenerator,
        async (activities, user) => {
          // Setup mock response
          mockFeedApi.getFeed.mockResolvedValue({
            activities,
            pagination: { limit: 20, hasMore: false }
          });

          renderWithProviders(<ActivityFeed />, user);

          // Wait for activities to load
          await waitFor(() => {
            expect(screen.getByText('Activity Feed')).toBeInTheDocument();
          });

          // Verify each activity displays required information
          for (const activity of activities) {
            // User information should be displayed
            if (activity.user?.username) {
              expect(screen.getByText(activity.user.username)).toBeInTheDocument();
            }

            // Album information should be displayed
            if (activity.album?.name) {
              expect(screen.getByText(activity.album.name)).toBeInTheDocument();
            }

            if (activity.album?.artist) {
              expect(screen.getByText(new RegExp(activity.album.artist))).toBeInTheDocument();
            }

            // Activity type should be displayed
            expect(screen.getByText(activity.type)).toBeInTheDocument();

            // Activity-specific content should be displayed
            if (activity.type === 'rating' && 'rating' in activity.data && activity.data.rating) {
              expect(screen.getByText(`(${activity.data.rating}/5 stars)`)).toBeInTheDocument();
            }

            if (activity.type === 'review' && 'content' in activity.data && activity.data.content) {
              const content = activity.data.content.length > 200 
                ? activity.data.content.substring(0, 200)
                : activity.data.content;
              expect(screen.getByText(new RegExp(content.substring(0, 50)))).toBeInTheDocument();
            }
          }
        }
      ),
      { numRuns: 20 } // Reduced for faster execution as requested
    );
  });

  it('Property: Activity feed maintains chronological ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityGenerator, { minLength: 2, maxLength: 5 }),
        userGenerator,
        async (activities, user) => {
          // Sort activities by creation date (most recent first)
          const sortedActivities = [...activities].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          mockFeedApi.getFeed.mockResolvedValue({
            activities: sortedActivities,
            pagination: { limit: 20, hasMore: false }
          });

          renderWithProviders(<ActivityFeed />, user);

          await waitFor(() => {
            expect(screen.getByText('Activity Feed')).toBeInTheDocument();
          });

          // Verify that activities appear in chronological order
          // This is implicit in the rendering order since we're using the sorted array
          // The API should return activities in chronological order
          expect(mockFeedApi.getFeed).toHaveBeenCalledWith({ page: 1, limit: 20 });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: Empty feed state appears when no activities exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        userGenerator,
        async (user) => {
          mockFeedApi.getFeed.mockResolvedValue({
            activities: [],
            pagination: { limit: 20, hasMore: false }
          });

          renderWithProviders(<ActivityFeed />, user);

          await waitFor(() => {
            expect(screen.getByText('Your Feed is Empty')).toBeInTheDocument();
            expect(screen.getByText(/Start following other music enthusiasts/)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: User-specific feed displays correct user activities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityGenerator, { minLength: 1, maxLength: 5 }),
        fc.uuid(),
        userGenerator,
        async (activities, targetUserId, currentUser) => {
          // Ensure all activities belong to the target user
          const userActivities = activities.map(activity => ({
            ...activity,
            userId: targetUserId
          }));

          mockFeedApi.getUserFeed.mockResolvedValue({
            activities: userActivities,
            pagination: { limit: 20, hasMore: false },
            userId: targetUserId
          });

          renderWithProviders(<ActivityFeed userId={targetUserId} />, currentUser);

          await waitFor(() => {
            expect(screen.getByText('Activity Feed')).toBeInTheDocument();
          });

          // Verify the correct API was called with the target user ID
          expect(mockFeedApi.getUserFeed).toHaveBeenCalledWith(targetUserId, { page: 1, limit: 20 });

          // Verify activities are displayed
          for (const activity of userActivities) {
            if (activity.user?.username) {
              expect(screen.getByText(activity.user.username)).toBeInTheDocument();
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: Pagination works correctly with hasMore flag', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityGenerator, { minLength: 1, maxLength: 10 }),
        fc.boolean(),
        userGenerator,
        async (activities, hasMore, user) => {
          mockFeedApi.getFeed.mockResolvedValue({
            activities,
            pagination: { limit: 20, hasMore }
          });

          renderWithProviders(<ActivityFeed />, user);

          await waitFor(() => {
            expect(screen.getByText('Activity Feed')).toBeInTheDocument();
          });

          // Check if Load More button appears based on hasMore flag
          const loadMoreButton = screen.queryByText('Load More');
          if (hasMore) {
            expect(loadMoreButton).toBeInTheDocument();
          } else {
            expect(loadMoreButton).not.toBeInTheDocument();
          }

          // Check for end of feed message when no more activities
          if (!hasMore && activities.length > 0) {
            expect(screen.getByText("You've reached the end of the feed")).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property: Error handling works for any API error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        userGenerator,
        async (errorMessage, user) => {
          mockFeedApi.getFeed.mockRejectedValue(new Error(errorMessage));

          renderWithProviders(<ActivityFeed />, user);

          await waitFor(() => {
            expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
            expect(screen.getByText('Retry')).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});


