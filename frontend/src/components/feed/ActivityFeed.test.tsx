import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ActivityFeed } from './ActivityFeed';
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

describe('ActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    mockFeedApi.getFeed.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithProviders(<ActivityFeed />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders activity feed with activities', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
      expect(screen.getByText('reviewer')).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('Test Artist')).toBeInTheDocument();
    });
  });

  it('renders empty feed state when no activities', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Your Feed is Empty')).toBeInTheDocument();
      expect(screen.getByText(/Start following other music enthusiasts/)).toBeInTheDocument();
    });
  });

  it('renders error state when API call fails', async () => {
    mockFeedApi.getFeed.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load activity feed')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockFeedApi.getFeed).toHaveBeenCalledTimes(2);
  });

  it('handles load more button when hasMore is true', async () => {
    mockFeedApi.getFeed
      .mockResolvedValueOnce({
        activities: [mockActivity],
        pagination: { limit: 20, hasMore: true }
      })
      .mockResolvedValueOnce({
        activities: [{ ...mockActivity, id: 'activity-2' }],
        pagination: { limit: 20, hasMore: false }
      });

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByText('Load More');
    fireEvent.click(loadMoreButton);

    await waitFor(() => {
      expect(mockFeedApi.getFeed).toHaveBeenCalledTimes(2);
      expect(mockFeedApi.getFeed).toHaveBeenLastCalledWith({ page: 2, limit: 20 });
    });
  });

  it('renders user-specific feed when userId is provided', async () => {
    mockFeedApi.getUserFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false },
      userId: 'user-2'
    });

    renderWithProviders(<ActivityFeed userId="user-2" title="User Activity" />);

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
      expect(mockFeedApi.getUserFeed).toHaveBeenCalledWith('user-2', { page: 1, limit: 20 });
    });
  });

  it('shows end of feed message when no more activities', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText("You've reached the end of the feed")).toBeInTheDocument();
    });
  });

  it('does not render refresh button when showRefreshButton is false', async () => {
    mockFeedApi.getFeed.mockResolvedValue({
      activities: [mockActivity],
      pagination: { limit: 20, hasMore: false }
    });

    renderWithProviders(<ActivityFeed showRefreshButton={false} />);

    await waitFor(() => {
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
      expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
    });
  });
});


