import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewList } from './ReviewList';
import { Review } from '../../types';

const mockUser1 = {
  id: 'user-1',
  username: 'testuser1',
  email: 'test1@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockUser2 = {
  id: 'user-2',
  username: 'testuser2',
  email: 'test2@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockReviews: Review[] = [
  {
    id: 'review-1',
    userId: 'user-1',
    albumId: 'album-1',
    content: 'This is a great album! Really enjoyed listening to it.',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
    user: mockUser1,
  },
  {
    id: 'review-2',
    userId: 'user-2',
    albumId: 'album-1',
    content: 'Not bad, but could be better. Some tracks are really good though.',
    createdAt: '2023-01-02T15:30:00Z',
    updatedAt: '2023-01-02T15:30:00Z',
    user: mockUser2,
  },
  {
    id: 'review-3',
    userId: 'current-user',
    albumId: 'album-1',
    content: 'My own review that should be filtered out.',
    createdAt: '2023-01-03T09:15:00Z',
    updatedAt: '2023-01-03T09:15:00Z',
    user: {
      id: 'current-user',
      username: 'currentuser',
      email: 'current@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  },
];

describe('ReviewList', () => {
  it('displays community reviews excluding current user', () => {
    render(<ReviewList reviews={mockReviews} currentUserId="current-user" />);

    expect(screen.getByText('Community Reviews (2)')).toBeInTheDocument();
    
    // Should show other users' reviews
    expect(screen.getByText('testuser1')).toBeInTheDocument();
    expect(screen.getByText('This is a great album! Really enjoyed listening to it.')).toBeInTheDocument();
    
    expect(screen.getByText('testuser2')).toBeInTheDocument();
    expect(screen.getByText('Not bad, but could be better. Some tracks are really good though.')).toBeInTheDocument();
    
    // Should not show current user's review
    expect(screen.queryByText('currentuser')).not.toBeInTheDocument();
    expect(screen.queryByText('My own review that should be filtered out.')).not.toBeInTheDocument();
  });

  it('shows all reviews when no current user is specified', () => {
    render(<ReviewList reviews={mockReviews} />);

    expect(screen.getByText('Community Reviews (3)')).toBeInTheDocument();
    
    // Should show all reviews including the "current user" one
    expect(screen.getByText('testuser1')).toBeInTheDocument();
    expect(screen.getByText('testuser2')).toBeInTheDocument();
    expect(screen.getByText('currentuser')).toBeInTheDocument();
  });

  it('displays empty state when no reviews from other users', () => {
    const currentUserReviews = mockReviews.filter(r => r.userId === 'current-user');
    
    render(<ReviewList reviews={currentUserReviews} currentUserId="current-user" />);

    expect(screen.getByText('Community Reviews')).toBeInTheDocument();
    expect(screen.getByText('No reviews from other users yet. Be the first to share your thoughts!')).toBeInTheDocument();
  });

  it('displays empty state when no reviews at all', () => {
    render(<ReviewList reviews={[]} currentUserId="current-user" />);

    expect(screen.getByText('Community Reviews')).toBeInTheDocument();
    expect(screen.getByText('No reviews from other users yet. Be the first to share your thoughts!')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<ReviewList reviews={mockReviews} currentUserId="current-user" />);

    // Check that dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/January 1, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/January 2, 2023/)).toBeInTheDocument();
  });

  it('displays user avatars with correct initials', () => {
    render(<ReviewList reviews={mockReviews} currentUserId="current-user" />);

    // Check that avatars are present (they contain the first letter of username)
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(2); // Two reviews from other users
  });

  it('handles reviews without user data gracefully', () => {
    const reviewsWithoutUser: Review[] = [
      {
        id: 'review-1',
        userId: 'user-1',
        albumId: 'album-1',
        content: 'Review without user data',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:00:00Z',
      },
    ];

    render(<ReviewList reviews={reviewsWithoutUser} currentUserId="current-user" />);

    expect(screen.getByText('Anonymous User')).toBeInTheDocument();
    expect(screen.getByText('Review without user data')).toBeInTheDocument();
  });

  it('preserves whitespace and line breaks in review content', () => {
    const reviewWithFormatting: Review[] = [
      {
        id: 'review-1',
        userId: 'user-1',
        albumId: 'album-1',
        content: 'This is a review\nwith line breaks\n\nAnd multiple paragraphs.',
        createdAt: '2023-01-01T10:00:00Z',
        updatedAt: '2023-01-01T10:00:00Z',
        user: mockUser1,
      },
    ];

    render(<ReviewList reviews={reviewWithFormatting} currentUserId="current-user" />);

    const reviewContent = screen.getByText(/This is a review.*with line breaks.*And multiple paragraphs\./);
    expect(reviewContent).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });

  it('handles invalid dates gracefully', () => {
    const reviewWithInvalidDate: Review[] = [
      {
        id: 'review-1',
        userId: 'user-1',
        albumId: 'album-1',
        content: 'Review with invalid date',
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
        user: mockUser1,
      },
    ];

    render(<ReviewList reviews={reviewWithInvalidDate} currentUserId="current-user" />);

    expect(screen.getByText('Unknown date')).toBeInTheDocument();
  });
});


