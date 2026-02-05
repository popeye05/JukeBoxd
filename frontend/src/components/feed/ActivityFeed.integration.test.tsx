import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ActivityFeedPage } from './ActivityFeedPage';
import { useAuth } from '../../contexts/AuthContext';
import { feedApi } from '../../services/feedApi';
import { Activity, User } from '../../types';

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

const mockUser: User = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockActivity: Activity = {
  id: 'activity-1',
  userId: 'user-2',
  type: 'rating',
  albumId: 'album-1',
  data: { rating: 4 },
  createdAt: '2023-01-01T00:00:00Z',
  user: {
    id: 'user-2',
    username: 'reviewer',
    email: 'reviewer@example.com',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  album: {
    id: 'album-1',
    spotifyId: 'spotify-1',
    name: 'Test Album',
    artist: 'Test Artist',
    releaseDate: '2023-01-01',
    imageUrl: 'https://example.com/image.jpg',
    spotifyUrl: 'https://music.apple.com/album/test',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
};

const renderWithProviders = (component: React.ReactElement, user: User | null = mockUser) => {
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

describe('ActivityFeed Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete activity feed page with activities', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeedPage />);

    await waitFor(() => {
      // Check page title
      expect(screen.getByText('Your Activity Feed')).toBeInTheDocument();
      
      // Check activity content
      expect(screen.getByText('reviewer')).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
      expect(screen.getByText('(4/5 stars)')).toBeInTheDocument();
      
      // Check refresh button
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('renders empty feed state when no activities', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeedPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Feed is Empty')).toBeInTheDocument();
      expect(screen.getByText('Discover Albums')).toBeInTheDocument();
      expect(screen.getByText('Find Users to Follow')).toBeInTheDocument();
    });
  });

  it('handles multiple activity types correctly', async () => {
    const reviewActivity: Activity = {
      id: 'activity-2',
      userId: 'user-3',
      type: 'review',
      albumId: 'album-2',
      data: { content: 'Great album with amazing vocals!' },
      createdAt: '2023-01-02T00:00:00Z',
      user: {
        id: 'user-3',
        username: 'musiclover',
        email: 'music@example.com',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      },
      album: {
        id: 'album-2',
        spotifyId: 'spotify-2',
        name: 'Another Album',
        artist: 'Another Artist',
        releaseDate: '2023-01-01',
        imageUrl: 'https://example.com/image2.jpg',
        spotifyUrl: 'https://music.apple.com/album/test2',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    };

    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity, reviewActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeedPage />);

    await waitFor(() => {
      // Check both activities are displayed
      expect(screen.getByText('reviewer')).toBeInTheDocument();
      expect(screen.getByText('musiclover')).toBeInTheDocument();
      
      // Check rating activity
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('(4/5 stars)')).toBeInTheDocument();
      
      // Check review activity
      expect(screen.getByText('Another Album')).toBeInTheDocument();
      expect(screen.getByText('"Great album with amazing vocals!"')).toBeInTheDocument();
      
      // Check activity type chips
      expect(screen.getByText('rating')).toBeInTheDocument();
      expect(screen.getByText('review')).toBeInTheDocument();
    });
  });

  it('displays proper chronological ordering', async () => {
    const olderActivity: Activity = {
      ...mockActivity,
      id: 'activity-old',
      createdAt: '2023-01-01T00:00:00Z'
    };

    const newerActivity: Activity = {
      ...mockActivity,
      id: 'activity-new',
      createdAt: '2023-01-02T00:00:00Z',
      user: {
        ...mockActivity.user!,
        username: 'newuser'
      }
    };

    mockFeedApi.getFeed.mockResolvedValue({
      activities: [newerActivity, olderActivity], // API should return in chronological order
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeedPage />);

    await waitFor(() => {
      const usernames = screen.getAllByText(/reviewer|newuser/);
      // The newer activity should appear first
      expect(usernames[0]).toHaveTextContent('newuser');
      expect(usernames[1]).toHaveTextContent('reviewer');
    });
  });
});


