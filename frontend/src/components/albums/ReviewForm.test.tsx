import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../../contexts/AuthContext';
import { reviewService } from '../../services/reviewService';
import { Review } from '../../types';

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the review service
jest.mock('../../services/reviewService');
const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;

// Mock user data
const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockReview: Review = {
  id: 'review-1',
  userId: 'user-1',
  albumId: 'album-1',
  content: 'This is a great album!',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  user: mockUser,
};

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(),
});

describe('ReviewForm', () => {
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

    render(<ReviewForm albumId="album-1" />);

    expect(screen.getByText('Please log in to write a review for this album')).toBeInTheDocument();
  });

  it('shows review form for new review when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(<ReviewForm albumId="album-1" />);

    expect(screen.getByText('Write a Review')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Share your thoughts about this album...')).toBeInTheDocument();
    expect(screen.getByText('Submit Review')).toBeInTheDocument();
  });

  it('displays existing review in read-only mode', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(<ReviewForm albumId="album-1" existingReview={mockReview} />);

    expect(screen.getByText('Your Review')).toBeInTheDocument();
    expect(screen.getByText('This is a great album!')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('allows user to submit a new review', async () => {
    const mockOnReviewSubmit = jest.fn();
    const newReview = { ...mockReview, content: 'Amazing album!' };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockReviewService.createReview.mockResolvedValue(newReview);

    render(<ReviewForm albumId="album-1" onReviewSubmit={mockOnReviewSubmit} />);

    const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
    const submitButton = screen.getByText('Submit Review');

    fireEvent.change(textArea, { target: { value: 'Amazing album!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockReviewService.createReview).toHaveBeenCalledWith('album-1', 'Amazing album!');
      expect(mockOnReviewSubmit).toHaveBeenCalledWith(newReview);
    });
  });

  it('prevents submission of empty review', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(<ReviewForm albumId="album-1" />);

    const submitButton = screen.getByText('Submit Review');
    expect(submitButton).toBeDisabled();

    // Try submitting whitespace-only content
    const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
    fireEvent.change(textArea, { target: { value: '   \n\t  ' } });

    expect(submitButton).toBeDisabled();
  });

  it('shows validation error for whitespace-only content', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(<ReviewForm albumId="album-1" />);

    const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
    fireEvent.change(textArea, { target: { value: '   ' } });
    fireEvent.blur(textArea);

    expect(screen.getByText('Review cannot be empty or contain only whitespace')).toBeInTheDocument();
  });

  it('allows user to edit existing review', async () => {
    const mockOnReviewUpdate = jest.fn();
    const updatedReview = { ...mockReview, content: 'Updated review content' };
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockReviewService.updateReview.mockResolvedValue(updatedReview);

    render(<ReviewForm albumId="album-1" existingReview={mockReview} onReviewUpdate={mockOnReviewUpdate} />);

    // Click edit button
    fireEvent.click(screen.getByText('Edit'));

    // Form should now be in edit mode
    expect(screen.getByText('Edit Your Review')).toBeInTheDocument();
    
    const textArea = screen.getByDisplayValue('This is a great album!');
    fireEvent.change(textArea, { target: { value: 'Updated review content' } });
    
    const updateButton = screen.getByText('Update Review');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockReviewService.updateReview).toHaveBeenCalledWith('review-1', 'Updated review content');
      expect(mockOnReviewUpdate).toHaveBeenCalledWith(updatedReview);
    });
  });

  it('allows user to delete existing review', async () => {
    const mockOnReviewDelete = jest.fn();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockReviewService.deleteReview.mockResolvedValue();
    (window.confirm as jest.Mock).mockReturnValue(true);

    render(<ReviewForm albumId="album-1" existingReview={mockReview} onReviewDelete={mockOnReviewDelete} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this review?');
      expect(mockReviewService.deleteReview).toHaveBeenCalledWith('review-1');
      expect(mockOnReviewDelete).toHaveBeenCalledWith('review-1');
    });
  });

  it('cancels delete when user declines confirmation', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    (window.confirm as jest.Mock).mockReturnValue(false);

    render(<ReviewForm albumId="album-1" existingReview={mockReview} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockReviewService.deleteReview).not.toHaveBeenCalled();
  });

  it('handles review submission errors', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    mockReviewService.createReview.mockRejectedValue(new Error('Network error'));

    render(<ReviewForm albumId="album-1" />);

    const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
    const submitButton = screen.getByText('Submit Review');

    fireEvent.change(textArea, { target: { value: 'Great album!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save review. Please try again.')).toBeInTheDocument();
    });
  });

  it('allows user to cancel editing', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });

    render(<ReviewForm albumId="album-1" existingReview={mockReview} />);

    // Click edit button
    fireEvent.click(screen.getByText('Edit'));

    // Modify content
    const textArea = screen.getByDisplayValue('This is a great album!');
    fireEvent.change(textArea, { target: { value: 'Modified content' } });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Should be back to read-only mode with original content
    expect(screen.getByText('Your Review')).toBeInTheDocument();
    expect(screen.getByText('This is a great album!')).toBeInTheDocument();
  });
});


