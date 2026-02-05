import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ActivityFeedItem } from './ActivityFeedItem';
import { Activity } from '../../types';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago')
}));

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockRatingActivity: Activity = {
  id: 'activity-1',
  userId: 'user-1',
  type: 'rating',
  albumId: 'album-1',
  data: { rating: 4 },
  createdAt: '2023-01-01T00:00:00Z',
  user: {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
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

const mockReviewActivity: Activity = {
  id: 'activity-2',
  userId: 'user-2',
  type: 'review',
  albumId: 'album-2',
  data: { content: 'This is an amazing album with great production and meaningful lyrics.' },
  createdAt: '2023-01-01T00:00:00Z',
  user: {
    id: 'user-2',
    username: 'reviewer',
    email: 'reviewer@example.com',
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

describe('ActivityFeedItem', () => {
  it('renders rating activity correctly', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('rated')).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('by Test Artist')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('(4/5 stars)')).toBeInTheDocument();
    expect(screen.getByText('rating')).toBeInTheDocument();
  });

  it('renders review activity correctly', () => {
    renderWithTheme(<ActivityFeedItem activity={mockReviewActivity} />);

    expect(screen.getByText('reviewer')).toBeInTheDocument();
    expect(screen.getByText('reviewed')).toBeInTheDocument();
    expect(screen.getByText('Another Album')).toBeInTheDocument();
    expect(screen.getByText('by Another Artist')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('"This is an amazing album with great production and meaningful lyrics."')).toBeInTheDocument();
    expect(screen.getByText('review')).toBeInTheDocument();
  });

  it('truncates long review content', () => {
    const longReviewActivity = {
      ...mockReviewActivity,
      data: {
        content: 'This is a very long review that should be truncated because it exceeds the maximum length that we want to display in the feed item. It contains many words and goes on and on about the album in great detail, discussing every aspect of the music, production, lyrics, and overall experience.'
      }
    };

    renderWithTheme(<ActivityFeedItem activity={longReviewActivity} />);

    expect(screen.getByText(/This is a very long review that should be truncated/)).toBeInTheDocument();
    expect(screen.getByText(/\.\.\."/)).toBeInTheDocument();
  });

  it('renders album cover image when available', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    const albumImage = screen.getByAltText('Test Album cover');
    expect(albumImage).toBeInTheDocument();
    expect(albumImage).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders user avatar with first letter of username', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'testuser'
  });

  it('handles missing user data gracefully', () => {
    const activityWithoutUser = {
      ...mockRatingActivity,
      user: undefined
    };

    renderWithTheme(<ActivityFeedItem activity={activityWithoutUser} />);

    expect(screen.getByText('Unknown User')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // Default avatar letter
  });

  it('handles missing album data gracefully', () => {
    const activityWithoutAlbum = {
      ...mockRatingActivity,
      album: undefined
    };

    renderWithTheme(<ActivityFeedItem activity={activityWithoutAlbum} />);

    expect(screen.getByText('Unknown Album')).toBeInTheDocument();
    expect(screen.getByText('by Unknown Artist')).toBeInTheDocument();
  });

  it('renders rating stars correctly', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    // Check that the rating component is rendered (Material-UI Rating component)
    const ratingElement = screen.getByRole('img', { name: /4 Stars/i });
    expect(ratingElement).toBeInTheDocument();
  });

  it('creates clickable link to Last.fm album', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    const albumLink = screen.getByRole('link');
    expect(albumLink).toHaveAttribute('href', 'https://music.apple.com/album/test');
    expect(albumLink).toHaveAttribute('target', '_blank');
    expect(albumLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders appropriate icon for rating activity', () => {
    renderWithTheme(<ActivityFeedItem activity={mockRatingActivity} />);

    // Check for star icon (Material-UI uses SVG with specific test id or class)
    const chip = screen.getByText('rating').closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
  });

  it('renders appropriate icon for review activity', () => {
    renderWithTheme(<ActivityFeedItem activity={mockReviewActivity} />);

    // Check for review icon
    const chip = screen.getByText('review').closest('.MuiChip-root');
    expect(chip).toBeInTheDocument();
  });
});


