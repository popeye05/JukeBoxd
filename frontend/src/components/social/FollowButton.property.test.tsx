import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import fc from 'fast-check';
import FollowButton from './FollowButton';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi } from '../../services/socialApi';

// Feature: jukeboxd, Property 6: Follow Relationship Management

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the social API
jest.mock('../../services/socialApi');
const mockSocialApi = socialApi as jest.Mocked<typeof socialApi>;

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

const userArb = fc.record({
  id: userIdArb,
  username: usernameArb,
  email: emailArb,
  createdAt: dateArb,
  updatedAt: dateArb
});

const followResponseArb = fc.record({
  follow: fc.record({
    id: fc.uuid(),
    followerId: userIdArb,
    followeeId: userIdArb,
    createdAt: dateArb
  }),
  message: fc.string()
});

const unfollowResponseArb = fc.record({
  success: fc.boolean(),
  message: fc.string()
});

describe('FollowButton Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 6: Follow Relationship Management
   * For any two distinct users, creating a follow relationship should update 
   * follower/following counts and be reflected in profile displays and button states
   * **Validates: Requirements 4.2, 4.3, 4.4**
   */
  it('should manage follow relationships correctly for any two distinct users', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArb,
        userArb,
        fc.boolean(), // initial follow state
        async (currentUser, targetUser, initiallyFollowing) => {
          // Ensure users are distinct (requirement: two distinct users)
          fc.pre(currentUser.id !== targetUser.id);

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

          mockSocialApi.isFollowing.mockResolvedValue(initiallyFollowing);

          const followResponse = {
            follow: {
              id: 'follow-id',
              followerId: currentUser.id,
              followeeId: targetUser.id,
              createdAt: new Date().toISOString()
            },
            message: 'Successfully followed user'
          };

          const unfollowResponse = {
            success: true,
            message: 'Successfully unfollowed user'
          };

          mockSocialApi.followUser.mockResolvedValue(followResponse);
          mockSocialApi.unfollowUser.mockResolvedValue(unfollowResponse);

          const onFollowChange = jest.fn();

          // Render component
          const { unmount } = renderWithTheme(
            <FollowButton
              userId={targetUser.id}
              username={targetUser.username}
              onFollowChange={onFollowChange}
            />
          );

          try {
            // Wait for initial state to load
            await waitFor(() => {
              if (initiallyFollowing) {
                expect(screen.getByText(`Unfollow ${targetUser.username}`)).toBeInTheDocument();
              } else {
                expect(screen.getByText(`Follow ${targetUser.username}`)).toBeInTheDocument();
              }
            });

            // Test follow/unfollow action
            const button = initiallyFollowing 
              ? screen.getByText(`Unfollow ${targetUser.username}`)
              : screen.getByText(`Follow ${targetUser.username}`);

            fireEvent.click(button);

            // Verify API call and state change
            await waitFor(() => {
              if (initiallyFollowing) {
                // Requirement 4.3: Remove following relationship and update button state
                expect(mockSocialApi.unfollowUser).toHaveBeenCalledWith(targetUser.id);
                expect(onFollowChange).toHaveBeenCalledWith(false);
                expect(screen.getByText(`Follow ${targetUser.username}`)).toBeInTheDocument();
              } else {
                // Requirement 4.2: Create following relationship and update button state
                expect(mockSocialApi.followUser).toHaveBeenCalledWith(targetUser.id);
                expect(onFollowChange).toHaveBeenCalledWith(true);
                expect(screen.getByText(`Unfollow ${targetUser.username}`)).toBeInTheDocument();
              }
            });

            // Verify button state reflects the relationship change
            const newButtonText = initiallyFollowing 
              ? `Follow ${targetUser.username}`
              : `Unfollow ${targetUser.username}`;
            expect(screen.getByText(newButtonText)).toBeInTheDocument();

          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Follow Button Visibility
   * For any user, the follow button should only be visible when viewing
   * another user's profile (not their own)
   */
  it('should only show follow button for other users, never for self', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArb,
        userArb,
        async (currentUser, targetUser) => {
          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.isFollowing.mockResolvedValue(false);

          const { container, unmount } = renderWithTheme(
            <FollowButton
              userId={targetUser.id}
              username={targetUser.username}
            />
          );

          try {
            if (currentUser.id === targetUser.id) {
              // Should not render for same user
              expect(container.firstChild).toBeNull();
            } else {
              // Should render for different user
              await waitFor(() => {
                expect(screen.getByText(`Follow ${targetUser.username}`)).toBeInTheDocument();
              });
            }
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Button State Consistency
   * For any follow state, the button text and behavior should be consistent
   */
  it('should maintain consistent button text and behavior for any follow state', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArb,
        userArb,
        fc.boolean(),
        async (currentUser, targetUser, isFollowing) => {
          fc.pre(currentUser.id !== targetUser.id);

          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.isFollowing.mockResolvedValue(isFollowing);

          const { unmount } = renderWithTheme(
            <FollowButton
              userId={targetUser.id}
              username={targetUser.username}
            />
          );

          try {
            await waitFor(() => {
              const expectedText = isFollowing 
                ? `Unfollow ${targetUser.username}`
                : `Follow ${targetUser.username}`;
              expect(screen.getByText(expectedText)).toBeInTheDocument();
            });

            // Button should be clickable and not disabled
            const button = screen.getByRole('button');
            expect(button).not.toBeDisabled();
            expect(button).toBeInTheDocument();

          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Error Handling Consistency
   * For any API error, the button should handle it gracefully and maintain
   * its previous state
   */
  it('should handle API errors gracefully and maintain state', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArb,
        userArb,
        fc.boolean(),
        async (currentUser, targetUser, initialFollowState) => {
          fc.pre(currentUser.id !== targetUser.id);

          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

          mockUseAuth.mockReturnValue({
            user: currentUser,
            token: 'mock-token',
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            deleteAccount: jest.fn(),
            loading: false
    });

          mockSocialApi.isFollowing.mockResolvedValue(initialFollowState);
          
          // Mock API error
          const apiError = new Error('API Error');
          if (initialFollowState) {
            mockSocialApi.unfollowUser.mockRejectedValue(apiError);
          } else {
            mockSocialApi.followUser.mockRejectedValue(apiError);
          }

          const { unmount } = renderWithTheme(
            <FollowButton
              userId={targetUser.id}
              username={targetUser.username}
            />
          );

          try {
            // Wait for initial state
            await waitFor(() => {
              const expectedText = initialFollowState 
                ? `Unfollow ${targetUser.username}`
                : `Follow ${targetUser.username}`;
              expect(screen.getByText(expectedText)).toBeInTheDocument();
            });

            // Click button to trigger error
            const button = screen.getByRole('button');
            fireEvent.click(button);

            // Should handle error gracefully
            await waitFor(() => {
              expect(consoleSpy).toHaveBeenCalledWith('Error toggling follow status:', apiError);
              
              // Button should maintain original state after error
              const expectedText = initialFollowState 
                ? `Unfollow ${targetUser.username}`
                : `Follow ${targetUser.username}`;
              expect(screen.getByText(expectedText)).toBeInTheDocument();
            });

          } finally {
            consoleSpy.mockRestore();
            unmount();
          }
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });
});


