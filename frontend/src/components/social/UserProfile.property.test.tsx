import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import fc from 'fast-check';
import UserProfile from './UserProfile';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi } from '../../services/socialApi';
import { UserProfileWithStats } from '../../types';

// Feature: jukeboxd, Property 10: Profile Information Display

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the social API
jest.mock('../../services/socialApi');
const mockSocialApi = socialApi as jest.Mocked<typeof socialApi>;

// Mock the FollowButton component
jest.mock('./FollowButton', () => {
  return function MockFollowButton({ userId, username }: { userId: string; username: string }) {
    return <button data-testid="follow-button">Follow {username}</button>;
  };
});

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Generators for property-based testing
const userIdArb = fc.uuid();
const usernameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const emailArb = fc.emailAddress();
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString());
const countArb = fc.integer({ min: 0, max: 10000 });

const userProfileArb = fc.record({
  id: userIdArb,
  username: usernameArb,
  email: emailArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  followersCount: countArb,
  followingCount: countArb,
  ratingsCount: countArb,
  reviewsCount: countArb
});

const currentUserArb = fc.record({
  id: userIdArb,
  username: usernameArb,
  email: emailArb,
  createdAt: dateArb,
  updatedAt: dateArb
});

describe('UserProfile Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 10: Profile Information Display
   * For any user profile view, the display should include all required information 
   * (username, join date, recent activity) with appropriate editing capabilities 
   * for the profile owner
   * **Validates: Requirements 6.4, 6.5**
   */
  it('should display all required profile information for any valid user profile', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileArb,
        currentUserArb,
        async (profileUser: UserProfileWithStats, currentUser) => {
          // Setup mocks
          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.getUserProfile.mockResolvedValue(profileUser);

          // Render component
          const { unmount } = renderWithTheme(
            <UserProfile userId={profileUser.id} />
          );

          try {
            // Wait for profile to load
            await waitFor(() => {
              // Requirement 6.4: Display username, join date, and recent activity
              expect(screen.getByText(profileUser.username)).toBeInTheDocument();
              
              // Join date should be formatted and displayed
              const joinDate = new Date(profileUser.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
              expect(screen.getByText(`Joined ${joinDate}`)).toBeInTheDocument();

              // Social stats should be displayed (recent activity indicators)
              expect(screen.getByText(profileUser.followersCount.toString())).toBeInTheDocument();
              expect(screen.getByText(profileUser.followingCount.toString())).toBeInTheDocument();
              expect(screen.getByText(profileUser.ratingsCount.toString())).toBeInTheDocument();
              expect(screen.getByText(profileUser.reviewsCount.toString())).toBeInTheDocument();

              // Labels should be present
              expect(screen.getByText('Followers')).toBeInTheDocument();
              expect(screen.getByText('Following')).toBeInTheDocument();
              expect(screen.getByText('Ratings')).toBeInTheDocument();
              expect(screen.getByText('Reviews')).toBeInTheDocument();

              // Requirement 6.5: Show editing capabilities for own profile
              const isOwnProfile = currentUser.id === profileUser.id;
              if (isOwnProfile) {
                expect(screen.getByText('Your Profile')).toBeInTheDocument();
                // Follow button should not be shown for own profile
                expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
              } else {
                // Follow button should be shown for other profiles
                expect(screen.queryByText('Your Profile')).not.toBeInTheDocument();
                expect(screen.getByTestId('follow-button')).toBeInTheDocument();
              }
            }, { timeout: 5000 });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Profile Display Completeness
   * For any user profile, all numerical stats should be non-negative and 
   * properly formatted
   */
  it('should display non-negative stats with proper formatting', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileArb,
        currentUserArb,
        async (profileUser: UserProfileWithStats, currentUser) => {
          // Ensure all counts are non-negative (this should always be true from our generator)
          expect(profileUser.followersCount).toBeGreaterThanOrEqual(0);
          expect(profileUser.followingCount).toBeGreaterThanOrEqual(0);
          expect(profileUser.ratingsCount).toBeGreaterThanOrEqual(0);
          expect(profileUser.reviewsCount).toBeGreaterThanOrEqual(0);

          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.getUserProfile.mockResolvedValue(profileUser);

          const { unmount } = renderWithTheme(
            <UserProfile userId={profileUser.id} />
          );

          try {
            await waitFor(() => {
              // All stats should be displayed as strings
              const followersText = screen.getByText(profileUser.followersCount.toString());
              const followingText = screen.getByText(profileUser.followingCount.toString());
              const ratingsText = screen.getByText(profileUser.ratingsCount.toString());
              const reviewsText = screen.getByText(profileUser.reviewsCount.toString());

              expect(followersText).toBeInTheDocument();
              expect(followingText).toBeInTheDocument();
              expect(ratingsText).toBeInTheDocument();
              expect(reviewsText).toBeInTheDocument();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Username Display Consistency
   * For any valid username, it should be displayed consistently in both
   * the profile header and avatar
   */
  it('should display username consistently across profile elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileArb,
        currentUserArb,
        async (profileUser: UserProfileWithStats, currentUser) => {
          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.getUserProfile.mockResolvedValue(profileUser);

          const { unmount } = renderWithTheme(
            <UserProfile userId={profileUser.id} />
          );

          try {
            await waitFor(() => {
              // Username should appear in the header
              expect(screen.getByText(profileUser.username)).toBeInTheDocument();
              
              // First letter of username should appear in avatar
              const firstLetter = profileUser.username.charAt(0).toUpperCase();
              expect(screen.getByText(firstLetter)).toBeInTheDocument();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Compact Mode Consistency
   * For any user profile in compact mode, essential information should still
   * be displayed but in a condensed format
   */
  it('should maintain essential information in compact mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        userProfileArb,
        currentUserArb,
        async (profileUser: UserProfileWithStats, currentUser) => {
          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.getUserProfile.mockResolvedValue(profileUser);

          const { unmount } = renderWithTheme(
            <UserProfile userId={profileUser.id} compact={true} />
          );

          try {
            await waitFor(() => {
              // Essential information should be present in compact mode
              expect(screen.getByText(profileUser.username)).toBeInTheDocument();
              
              // Compact format should show followers and following in one line
              const compactStats = `${profileUser.followersCount} followers • ${profileUser.followingCount} following`;
              expect(screen.getByText(compactStats)).toBeInTheDocument();

              // Detailed stats should not be shown in compact mode
              expect(screen.queryByText('Ratings')).not.toBeInTheDocument();
              expect(screen.queryByText('Reviews')).not.toBeInTheDocument();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });
});


