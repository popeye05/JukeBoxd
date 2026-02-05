import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlbumDetail } from './AlbumDetail';
import { albumService } from '../../services/albumService';
import { useAuth } from '../../contexts/AuthContext';
import { Album, Rating, Review } from '../../types';

// Mock the album service
jest.mock('../../services/albumService');
const mockedAlbumService = albumService as jest.Mocked<typeof albumService>;

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the rating and review services
jest.mock('../../services/ratingService');
jest.mock('../../services/reviewService');

// Mock data
const mockAlbum: Album = {
  id: '1',
  spotifyId: 'spotify1',
  name: 'Test Album',
  artist: 'Test Artist',
  releaseDate: '2023-01-01',
  imageUrl: 'https://example.com/image.jpg',
  spotifyUrl: 'https://open.spotify.com/album/spotify1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockRatings: Rating[] = [
  {
    id: '1',
    userId: 'user1',
    albumId: '1',
    rating: 4,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    userId: 'user2',
    albumId: '1',
    rating: 5,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

const mockReviews: Review[] = [
  {
    id: '1',
    userId: 'user1',
    albumId: '1',
    content: 'Great album! Really enjoyed it.',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    user: {
      id: 'user1',
      username: 'testuser1',
      email: 'test1@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    userId: 'user2',
    albumId: '1',
    content: 'Amazing production quality and songwriting.',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    user: {
      id: 'user2',
      username: 'testuser2',
      email: 'test2@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  },
];

describe('AlbumDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for useAuth - not authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });
  });

  it('renders album information correctly', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeInTheDocument();
      expect(screen.getByText('by Test Artist')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
    });
  });

  it('displays average rating correctly', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      // Average of 4 and 5 is 4.5
      expect(screen.getByText('4.5 (2 ratings)')).toBeInTheDocument();
    });
  });

  it('displays no ratings message when no ratings exist', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue([]);
    mockedAlbumService.getAlbumReviews.mockResolvedValue([]);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('No ratings yet')).toBeInTheDocument();
    });
  });

  it('displays reviews correctly', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('Community Reviews (2)')).toBeInTheDocument();
      expect(screen.getByText('Great album! Really enjoyed it.')).toBeInTheDocument();
      expect(screen.getByText('Amazing production quality and songwriting.')).toBeInTheDocument();
      expect(screen.getByText('testuser1')).toBeInTheDocument();
      expect(screen.getByText('testuser2')).toBeInTheDocument();
    });
  });

  it('displays no reviews message when no reviews exist', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue([]);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('Community Reviews')).toBeInTheDocument();
      expect(screen.getByText('No reviews from other users yet. Be the first to share your thoughts!')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockedAlbumService.getAlbumRatings.mockImplementation(() => new Promise(() => {}));
    mockedAlbumService.getAlbumReviews.mockImplementation(() => new Promise(() => {}));

    render(<AlbumDetail album={mockAlbum} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    mockedAlbumService.getAlbumRatings.mockRejectedValue(new Error('API Error'));
    mockedAlbumService.getAlbumReviews.mockRejectedValue(new Error('API Error'));

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load album details. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('calls onClose when back button is clicked', async () => {
    const mockOnClose = jest.fn();
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('Back to Search')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /back to search/i });
    userEvent.click(backButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not show back button when onClose is not provided', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    expect(screen.queryByText('Back to Search')).not.toBeInTheDocument();
  });

  it('displays Spotify link correctly', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      const lastFmLink = screen.getByRole('link', { name: /open in last\.fm/i });
      expect(lastFmLink).toHaveAttribute('href', 'https://music.apple.com/album/spotify1');
      expect(lastFmLink).toHaveAttribute('target', '_blank');
    });
  });

  it('handles album without Spotify URL', async () => {
    const albumWithoutSpotifyUrl = { ...mockAlbum, spotifyUrl: '' };
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={albumWithoutSpotifyUrl} />);

    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /open in last\.fm/i })).not.toBeInTheDocument();
  });

  it('formats release year correctly', async () => {
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={mockAlbum} />);

    await waitFor(() => {
      expect(screen.getByText('2023')).toBeInTheDocument();
    });
  });

  it('handles invalid release date gracefully', async () => {
    const albumWithInvalidDate = { ...mockAlbum, releaseDate: 'invalid-date' };
    mockedAlbumService.getAlbumRatings.mockResolvedValue(mockRatings);
    mockedAlbumService.getAlbumReviews.mockResolvedValue(mockReviews);

    render(<AlbumDetail album={albumWithInvalidDate} />);

    await waitFor(() => {
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});


