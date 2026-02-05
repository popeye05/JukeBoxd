/**
 * Frontend Integration Tests for Critical User Journeys
 * 
 * These tests validate complete frontend user workflows with mocked backend:
 * 1. User Registration and Login Flow
 * 2. Album Discovery and Rating Workflow  
 * 3. Social Following and Feed Generation Workflow
 * 
 * **Validates: Requirements 1, 2, 3, 4, 5, 6**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from '../../contexts/AuthContext';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import { AlbumSearch } from '../../components/albums/AlbumSearch';
import { AlbumDetail } from '../../components/albums/AlbumDetail';
import { ActivityFeed } from '../../components/feed/ActivityFeed';
import UserProfile from '../../components/social/UserProfile';
import FollowButton from '../../components/social/FollowButton';
import api from '../../services/api';
import fc from 'fast-check';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

// Mock data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockAlbum = {
  id: 'album-1',
  spotifyId: 'spotify-album-1',
  name: 'Test Album',
  artist: 'Test Artist',
  releaseDate: '2023-01-01',
  imageUrl: 'https://example.com/album.jpg',
  spotifyUrl: 'https://music.apple.com/album/test',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockActivity = {
  id: 'activity-1',
  userId: 'user-2',
  type: 'rating' as const,
  albumId: 'album-1',
  data: { rating: 5 },
  createdAt: '2023-01-01T00:00:00Z',
  user: {
    id: 'user-2',
    username: 'otheruser',
    email: 'other@example.com',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  album: mockAlbum
};

describe('Frontend Integration Tests - Critical User Journeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Journey 1: User Registration and Login Flow', () => {
    it('should complete registration workflow', async () => {
      const user = userEvent;
      
      // Mock successful registration
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            token: 'mock-token',
            user: mockUser
          }
        }
      });

      // Mock profile fetch
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            user: mockUser
          }
        }
      });

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Fill out registration form
      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /register/i }));

      // Wait for API call
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('should complete login workflow', async () => {
      const user = userEvent;
      
      // Mock successful login
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            token: 'mock-token',
            user: mockUser
          }
        }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill out login form
      await user.type(screen.getByLabelText(/username or email/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Wait for API call
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
          usernameOrEmail: 'testuser',
          password: 'password123'
        });
      });
    });

    it('should handle login errors gracefully', async () => {
      const user = userEvent;
      
      // Mock failed login
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: {
              message: 'Invalid credentials'
            }
          }
        }
      });

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill out login form with invalid credentials
      await user.type(screen.getByLabelText(/username or email/i), 'wronguser');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');

      // Submit form
      await user.click(screen.getByRole('button', { name: /login/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should validate form inputs', async () => {
      const user = userEvent;

      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      );

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /register/i }));

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      // API should not be called
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('Journey 2: Album Discovery and Rating Workflow', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            user: mockUser
          }
        }
      });
    });

    it('should complete album search and rating workflow', async () => {
      const user = userEvent;
      
      // Mock search results
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            albums: [mockAlbum],
            total: 1
          }
        }
      });

      render(
        <TestWrapper>
          <AlbumSearch />
        </TestWrapper>
      );

      // Search for albums
      const searchInput = screen.getByPlaceholderText(/search for albums/i);
      await user.type(searchInput, 'test album');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Wait for search results
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/albums/search', {
          params: { q: 'test album', limit: 20 }
        });
      });

      // Should display search results
      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
        expect(screen.getByText('Test Artist')).toBeInTheDocument();
      });
    });

    it('should handle album rating', async () => {
      const user = userEvent;
      
      // Mock album details
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            album: mockAlbum,
            userRating: null,
            userReview: null,
            averageRating: 0,
            ratingsCount: 0
          }
        }
      });

      // Mock rating submission
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            rating: {
              id: 'rating-1',
              userId: mockUser.id,
              albumId: mockAlbum.id,
              rating: 4,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z'
            }
          }
        }
      });

      render(
        <TestWrapper>
          <AlbumDetail album={mockAlbum} />
        </TestWrapper>
      );

      // Wait for album to load
      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      // Rate the album (click 4th star)
      const stars = screen.getAllByRole('button', { name: /star/i });
      await user.click(stars[3]); // 4th star (0-indexed)

      // Wait for rating submission
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/ratings', {
          albumId: mockAlbum.id,
          rating: 4
        });
      });
    });

    it('should handle album review submission', async () => {
      const user = userEvent;
      
      // Mock album details
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            album: mockAlbum,
            userRating: null,
            userReview: null,
            averageRating: 0,
            ratingsCount: 0
          }
        }
      });

      // Mock review submission
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            review: {
              id: 'review-1',
              userId: mockUser.id,
              albumId: mockAlbum.id,
              content: 'Great album!',
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z'
            }
          }
        }
      });

      render(
        <TestWrapper>
          <AlbumDetail album={mockAlbum} />
        </TestWrapper>
      );

      // Wait for album to load
      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      // Write a review
      const reviewTextarea = screen.getByPlaceholderText(/write your review/i);
      await user.type(reviewTextarea, 'Great album!');
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      // Wait for review submission
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/reviews', {
          albumId: mockAlbum.id,
          content: 'Great album!'
        });
      });
    });

    it('should prevent empty review submission', async () => {
      const user = userEvent;
      
      // Mock album details
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            album: mockAlbum,
            userRating: null,
            userReview: null,
            averageRating: 0,
            ratingsCount: 0
          }
        }
      });

      render(
        <TestWrapper>
          <AlbumDetail album={mockAlbum} />
        </TestWrapper>
      );

      // Wait for album to load
      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      // Try to submit empty review
      const submitButton = screen.getByRole('button', { name: /submit review/i });
      expect(submitButton).toBeDisabled();

      // Try with whitespace only
      const reviewTextarea = screen.getByPlaceholderText(/write your review/i);
      await user.type(reviewTextarea, '   ');
      expect(submitButton).toBeDisabled();

      // API should not be called
      expect(mockApi.post).not.toHaveBeenCalledWith('/reviews', expect.anything());
    });
  });

  describe('Journey 3: Social Following and Feed Generation Workflow', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockApi.get.mockResolvedValue({
        data: {
          data: {
            user: mockUser
          }
        }
      });
    });

    it('should complete follow user workflow', async () => {
      const user = userEvent;
      
      const otherUser = {
        id: 'user-2',
        username: 'otheruser',
        email: 'other@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      // Mock user profile
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            profile: {
              ...otherUser,
              followersCount: 0,
              followingCount: 0,
              ratingsCount: 5,
              reviewsCount: 3
            }
          }
        }
      });

      // Mock follow check
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            isFollowing: false
          }
        }
      });

      // Mock follow action
      mockApi.post.mockResolvedValueOnce({
        data: {
          data: {
            follow: {
              id: 'follow-1',
              followerId: mockUser.id,
              followeeId: otherUser.id,
              createdAt: '2023-01-01T00:00:00Z'
            },
            message: 'Successfully followed user'
          }
        }
      });

      render(
        <TestWrapper>
          <UserProfile userId={otherUser.id} />
        </TestWrapper>
      );

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
      });

      // Click follow button
      const followButton = screen.getByRole('button', { name: /follow/i });
      await user.click(followButton);

      // Wait for follow action
      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/social/follow', {
          userId: otherUser.id
        });
      });

      // Button should change to "Following"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
      });
    });

    it('should display activity feed', async () => {
      const user = userEvent;
      
      // Mock feed data
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            activities: [mockActivity],
            pagination: {
              limit: 20,
              hasMore: false,
              total: 1
            }
          }
        }
      });

      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      // Wait for feed to load
      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledWith('/feed', {
          params: { limit: 20, offset: 0 }
        });
      });

      // Should display activity
      await waitFor(() => {
        expect(screen.getByText('otheruser')).toBeInTheDocument();
        expect(screen.getByText('rated')).toBeInTheDocument();
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });
    });

    it('should handle empty feed state', async () => {
      const user = userEvent;
      
      // Mock empty feed
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            activities: [],
            pagination: {
              limit: 20,
              hasMore: false,
              total: 0
            }
          }
        }
      });

      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      // Wait for feed to load
      await waitFor(() => {
        expect(screen.getByText(/no activities yet/i)).toBeInTheDocument();
        expect(screen.getByText(/follow some users/i)).toBeInTheDocument();
      });
    });

    it('should handle unfollow action', async () => {
      const user = userEvent;
      
      // Mock follow button in following state
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            isFollowing: true
          }
        }
      });

      // Mock unfollow action
      mockApi.delete.mockResolvedValueOnce({
        data: {
          data: {
            success: true,
            message: 'Successfully unfollowed user'
          }
        }
      });

      render(
        <TestWrapper>
          <FollowButton userId="user-2" username="targetuser" />
        </TestWrapper>
      );

      // Wait for button to show "Following"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /following/i })).toBeInTheDocument();
      });

      // Click to unfollow
      await user.click(screen.getByRole('button', { name: /following/i }));

      // Wait for unfollow action
      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/social/follow/user-2');
      });

      // Button should change back to "Follow"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent;
      
      // Mock network error
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <TestWrapper>
          <AlbumSearch />
        </TestWrapper>
      );

      // Try to search
      await user.type(screen.getByPlaceholderText(/search for albums/i), 'test');
      await user.click(screen.getByRole('button', { name: /search/i }));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should handle API errors with proper messages', async () => {
      const user = userEvent;
      
      // Mock API error
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid rating value'
            }
          }
        }
      });

      // Mock album details
      mockApi.get.mockResolvedValueOnce({
        data: {
          data: {
            album: mockAlbum,
            userRating: null,
            userReview: null,
            averageRating: 0,
            ratingsCount: 0
          }
        }
      });

      render(
        <TestWrapper>
          <AlbumDetail album={mockAlbum} />
        </TestWrapper>
      );

      // Wait for album to load
      await waitFor(() => {
        expect(screen.getByText('Test Album')).toBeInTheDocument();
      });

      // Try to rate (this will trigger the mocked error)
      const stars = screen.getAllByRole('button', { name: /star/i });
      await user.click(stars[0]);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid rating value/i)).toBeInTheDocument();
      });
    });
  });

  describe('Property-Based Frontend Tests', () => {
    it('should handle various search queries correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (searchQuery) => {
            // Mock search response
            mockApi.get.mockResolvedValueOnce({
              data: {
                data: {
                  albums: [],
                  total: 0
                }
              }
            });

            const user = userEvent;
            
            render(
              <TestWrapper>
                <AlbumSearch />
              </TestWrapper>
            );

            // Search with the generated query
            const searchInput = screen.getByPlaceholderText(/search for albums/i);
            await user.clear(searchInput);
            await user.type(searchInput, searchQuery);
            await user.click(screen.getByRole('button', { name: /search/i }));

            // Should make API call with the query
            await waitFor(() => {
              expect(mockApi.get).toHaveBeenCalledWith('/albums/search', {
                params: { q: searchQuery, limit: 20 }
              });
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle various review content correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (reviewContent) => {
            // Mock album details
            mockApi.get.mockResolvedValueOnce({
              data: {
                data: {
                  album: mockAlbum,
                  userRating: null,
                  userReview: null,
                  averageRating: 0,
                  ratingsCount: 0
                }
              }
            });

            // Mock review submission
            mockApi.post.mockResolvedValueOnce({
              data: {
                data: {
                  review: {
                    id: 'review-1',
                    userId: mockUser.id,
                    albumId: mockAlbum.id,
                    content: reviewContent,
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z'
                  }
                }
              }
            });

            const user = userEvent;
            
            render(
              <TestWrapper>
                <AlbumDetail album={mockAlbum} />
              </TestWrapper>
            );

            // Wait for album to load
            await waitFor(() => {
              expect(screen.getByText('Test Album')).toBeInTheDocument();
            });

            // Submit review
            const reviewTextarea = screen.getByPlaceholderText(/write your review/i);
            await user.clear(reviewTextarea);
            await user.type(reviewTextarea, reviewContent);
            await user.click(screen.getByRole('button', { name: /submit review/i }));

            // Should make API call with the content
            await waitFor(() => {
              expect(mockApi.post).toHaveBeenCalledWith('/reviews', {
                albumId: mockAlbum.id,
                content: reviewContent
              });
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});


