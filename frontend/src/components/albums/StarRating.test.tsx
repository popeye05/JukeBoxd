import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StarRating } from './StarRating';
import { useAuth } from '../../contexts/AuthContext';
import { ratingService } from '../../services/ratingService';
import { Rating } from '../../types';

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the rating service
jest.mock('../../services/ratingService');
const mockRatingService = ratingService as jest.Mocked<typeof ratingService>;

// Mock user data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockRating: Rating = {
  id: 'rating-1',
  userId: 'user-1',
  albumId: 'album-1',
  rating: 4,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('StarRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(
      <StarRating
        albumId="album-1"
        averageRating={3.5}
        totalRatings={10}
      />
    );

    expect(screen.getByText('Please log in to rate this album')).toBeInTheDocument();
    expect(screen.getByText('3.5 (10 ratings)')).toBeInTheDocument();
  });

  it('shows no ratings message when there are no ratings and user not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(
      <StarRating
        albumId="album-1"
        averageRating={0}
        totalRatings={0}
      />
    );

    expect(screen.getByText('No ratings yet')).toBeInTheDocument();
  });

  it('displays user rating interface when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(
      <StarRating
        albumId="album-1"
        currentRating={mockRating}
        averageRating={3.5}
        totalRatings={10}
      />
    );

    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Community Rating')).toBeInTheDocument();
    expect(screen.getByText('Your Rating')).toBeInTheDocument();
    expect(screen.getByText('You rated this album 4 stars')).toBeInTheDocument();
  });

  it('allows user to submit a new rating', async () => {
    const mockOnRatingChange = jest.fn();
    const newRating = { ...mockRating, rating: 5 };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockRatingService.rateAlbum.mockResolvedValue(newRating);

    render(
      <StarRating
        albumId="album-1"
        onRatingChange={mockOnRatingChange}
        averageRating={3.5}
        totalRatings={10}
      />
    );

    // Find the rating component and click on the 5th star
    const ratingInputs = screen.getAllByRole('radio');
    fireEvent.click(ratingInputs[4]); // 5th star (0-indexed)

    await waitFor(() => {
      expect(mockRatingService.rateAlbum).toHaveBeenCalledWith('album-1', 5);
      expect(mockOnRatingChange).toHaveBeenCalledWith(newRating);
    });
  });

  it('allows user to remove their rating', async () => {
    const mockOnRatingChange = jest.fn();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockRatingService.deleteRating.mockResolvedValue();

    render(
      <StarRating
        albumId="album-1"
        currentRating={mockRating}
        onRatingChange={mockOnRatingChange}
        averageRating={3.5}
        totalRatings={10}
      />
    );

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRatingService.deleteRating).toHaveBeenCalledWith('rating-1');
      expect(mockOnRatingChange).toHaveBeenCalledWith(null);
    });
  });

  it('handles rating submission errors', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockRatingService.rateAlbum.mockRejectedValue(new Error('Network error'));

    render(
      <StarRating
        albumId="album-1"
        averageRating={3.5}
        totalRatings={10}
      />
    );

    // Click on the 3rd star
    const ratingInputs = screen.getAllByRole('radio');
    fireEvent.click(ratingInputs[2]);

    await waitFor(() => {
      expect(screen.getByText('Failed to save rating. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows community rating when there are multiple ratings', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(
      <StarRating
        albumId="album-1"
        averageRating={4.2}
        totalRatings={15}
      />
    );

    expect(screen.getByText('4.2 (15 ratings)')).toBeInTheDocument();
  });

  it('shows singular rating text for one rating', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(
      <StarRating
        albumId="album-1"
        averageRating={3.0}
        totalRatings={1}
      />
    );

    expect(screen.getByText('3.0 (1 rating)')).toBeInTheDocument();
  });
});


