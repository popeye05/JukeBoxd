import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { useAuth } from '../../contexts/AuthContext';
import { ratingService } from '../../services/ratingService';
import { reviewService } from '../../services/reviewService';
import { Rating, Review, User } from '../../types';

// Feature: jukeboxd, Property 2: Rating Storage and Retrieval
// **Validates: Requirements 2.2, 2.3**
// Feature: jukeboxd, Property 4: Review Storage and Chronological Ordering  
// **Validates: Requirements 3.2, 3.3, 3.4**
// Feature: jukeboxd, Property 5: Whitespace Review Rejection
// **Validates: Requirements 3.5**

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the services
jest.mock('../../services/ratingService');
jest.mock('../../services/reviewService');
const mockRatingService = ratingService as jest.Mocked<typeof ratingService>;
const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;

// Property test generators
const generateUser = (id: string): User => ({
  id,
  username: `user${id}${Math.random().toString(36).substring(7)}`,
  email: `user${id}@example.com`,
  createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateRating = (userId: string, albumId: string, rating: number): Rating => ({
  id: `rating-${Math.random().toString(36).substring(7)}`,
  userId,
  albumId,
  rating,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateReview = (userId: string, albumId: string, content: string): Review => ({
  id: `review-${Math.random().toString(36).substring(7)}`,
  userId,
  albumId,
  content,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateValidReviewContent = (): string => {
  const templates = [
    'This album is amazing!',
    'Great production quality and songwriting.',
    'Not my favorite, but has some good tracks.',
    'Absolutely love this album. Been listening to it on repeat.',
    'The artist really outdid themselves with this one.',
    'Mixed feelings about this album. Some tracks are great, others not so much.',
    'Perfect for a rainy day. Very atmospheric.',
    'This album changed my perspective on this genre.',
  ];
  
  const baseContent = templates[Math.floor(Math.random() * templates.length)];
  
  // Sometimes add extra content
  if (Math.random() > 0.5) {
    const extras = [
      '\n\nHighly recommend track 3!',
      ' The vocals are incredible.',
      '\n\nDefinitely worth multiple listens.',
      ' Production is top-notch.',
    ];
    return baseContent + extras[Math.floor(Math.random() * extras.length)];
  }
  
  return baseContent;
};

const generateWhitespaceContent = (): string => {
  const whitespaceChars = [' ', '\t', '\n', '\r'];
  const length = Math.floor(Math.random() * 20) + 1;
  return Array.from({ length }, () => 
    whitespaceChars[Math.floor(Math.random() * whitespaceChars.length)]
  ).join('');
};

describe('Rating and Review Property Tests', () => {
  const mockUser = generateUser('test-user');
  const albumId = 'test-album';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default authenticated user
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false,
    });
  });

  // Property 2: Rating Storage and Retrieval
  // For any valid user, album, and rating (1-5), storing a rating should make it 
  // retrievable and correctly associated with both user and album
  describe('Property 2: Rating Storage and Retrieval', () => {
    const validRatings = [1, 2, 3, 4, 5];
    
    validRatings.forEach(rating => {
      it(`should store and retrieve rating ${rating} correctly`, async () => {
        // Arrange
        const expectedRating = generateRating(mockUser.id, albumId, rating);
        const mockOnRatingChange = jest.fn();
        
        mockRatingService.rateAlbum.mockResolvedValue(expectedRating);

        // Act
        render(
          <StarRating
            albumId={albumId}
            onRatingChange={mockOnRatingChange}
            averageRating={0}
            totalRatings={0}
          />
        );

        // Find and click the rating
        const ratingInputs = screen.getAllByRole('radio');
        fireEvent.click(ratingInputs[rating - 1]); // Convert to 0-indexed

        // Assert
        await waitFor(() => {
          expect(mockRatingService.rateAlbum).toHaveBeenCalledWith(albumId, rating);
          expect(mockOnRatingChange).toHaveBeenCalledWith(expectedRating);
        });

        // Verify the rating is displayed
        expect(screen.getByText(`You rated this album ${rating} star${rating !== 1 ? 's' : ''}`)).toBeInTheDocument();
      });
    });

    it('should handle rating updates correctly', async () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        
        // Generate random initial and new ratings
        const initialRating = validRatings[Math.floor(Math.random() * validRatings.length)];
        const newRating = validRatings[Math.floor(Math.random() * validRatings.length)];
        
        const existingRating = generateRating(mockUser.id, albumId, initialRating);
        const updatedRating = generateRating(mockUser.id, albumId, newRating);
        const mockOnRatingChange = jest.fn();
        
        mockRatingService.rateAlbum.mockResolvedValue(updatedRating);

        const { unmount } = render(
          <StarRating
            albumId={albumId}
            currentRating={existingRating}
            onRatingChange={mockOnRatingChange}
            averageRating={3.5}
            totalRatings={5}
          />
        );

        try {
          // Should show existing rating
          expect(screen.getByText(`You rated this album ${initialRating} star${initialRating !== 1 ? 's' : ''}`)).toBeInTheDocument();

          // Update rating
          const ratingInputs = screen.getAllByRole('radio');
          fireEvent.click(ratingInputs[newRating - 1]);

          await waitFor(() => {
            expect(mockRatingService.rateAlbum).toHaveBeenCalledWith(albumId, newRating);
            expect(mockOnRatingChange).toHaveBeenCalledWith(updatedRating);
          });
        } finally {
          unmount();
        }
      }
    });

    it('should handle rating deletion correctly', async () => {
      const initialRating = validRatings[Math.floor(Math.random() * validRatings.length)];
      const existingRating = generateRating(mockUser.id, albumId, initialRating);
      const mockOnRatingChange = jest.fn();
      
      mockRatingService.deleteRating.mockResolvedValue();

      render(
        <StarRating
          albumId={albumId}
          currentRating={existingRating}
          onRatingChange={mockOnRatingChange}
          averageRating={3.5}
          totalRatings={5}
        />
      );

      // Click remove button
      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockRatingService.deleteRating).toHaveBeenCalledWith(existingRating.id);
        expect(mockOnRatingChange).toHaveBeenCalledWith(null);
      });
    });
  });

  // Property 4: Review Storage and Chronological Ordering
  // For any valid review content, storing a review should make it retrievable with 
  // correct timestamp, and multiple reviews should display in chronological order
  describe('Property 4: Review Storage and Chronological Ordering', () => {
    it('should store and retrieve reviews correctly', async () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        
        const reviewContent = generateValidReviewContent();
        const expectedReview = generateReview(mockUser.id, albumId, reviewContent);
        const mockOnReviewSubmit = jest.fn();
        
        mockReviewService.createReview.mockResolvedValue(expectedReview);

        const { unmount } = render(
          <ReviewForm
            albumId={albumId}
            onReviewSubmit={mockOnReviewSubmit}
          />
        );

        try {
          const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
          const submitButton = screen.getByText('Submit Review');

          // Enter review content
          fireEvent.change(textArea, { target: { value: reviewContent } });
          fireEvent.click(submitButton);

          await waitFor(() => {
            expect(mockReviewService.createReview).toHaveBeenCalledWith(albumId, reviewContent);
            expect(mockOnReviewSubmit).toHaveBeenCalledWith(expectedReview);
          });
        } finally {
          unmount();
        }
      }
    });

    it('should handle review updates correctly', async () => {
      const originalContent = generateValidReviewContent();
      const updatedContent = generateValidReviewContent();
      
      const existingReview = generateReview(mockUser.id, albumId, originalContent);
      const updatedReview = { ...existingReview, content: updatedContent };
      const mockOnReviewUpdate = jest.fn();
      
      mockReviewService.updateReview.mockResolvedValue(updatedReview);

      render(
        <ReviewForm
          albumId={albumId}
          existingReview={existingReview}
          onReviewUpdate={mockOnReviewUpdate}
        />
      );

      // Should show existing review
      expect(screen.getByText(originalContent)).toBeInTheDocument();

      // Click edit
      fireEvent.click(screen.getByText('Edit'));

      // Update content
      const textArea = screen.getByDisplayValue(originalContent);
      fireEvent.change(textArea, { target: { value: updatedContent } });
      
      const updateButton = screen.getByText('Update Review');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockReviewService.updateReview).toHaveBeenCalledWith(existingReview.id, updatedContent);
        expect(mockOnReviewUpdate).toHaveBeenCalledWith(updatedReview);
      });
    });
  });

  // Property 5: Whitespace Review Rejection
  // For any string composed entirely of whitespace characters, attempting to submit 
  // it as a review should be rejected and leave the system state unchanged
  describe('Property 5: Whitespace Review Rejection', () => {
    it('should reject whitespace-only reviews', async () => {
      const iterations = 20; // Test with 20 different whitespace combinations
      
      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        
        const whitespaceContent = generateWhitespaceContent();
        
        const { unmount } = render(
          <ReviewForm albumId={albumId} />
        );

        try {
          const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
          const submitButton = screen.getByText('Submit Review');

          // Enter whitespace content
          fireEvent.change(textArea, { target: { value: whitespaceContent } });

          // Submit button should be disabled
          expect(submitButton).toBeDisabled();

          // Try to submit anyway (shouldn't work)
          fireEvent.click(submitButton);

          // Service should not be called
          expect(mockReviewService.createReview).not.toHaveBeenCalled();
        } finally {
          unmount();
        }
      }
    });

    it('should show validation error for whitespace-only content', async () => {
      const whitespaceVariations = [
        '   ',
        '\t\t\t',
        '\n\n\n',
        ' \t \n \r ',
        '     \t\t\n\n     ',
      ];

      for (const whitespace of whitespaceVariations) {
        jest.clearAllMocks();
        
        const { unmount } = render(
          <ReviewForm albumId={albumId} />
        );

        try {
          const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
          
          fireEvent.change(textArea, { target: { value: whitespace } });
          fireEvent.blur(textArea);

          // Should show validation error
          expect(screen.getByText('Review cannot be empty or contain only whitespace')).toBeInTheDocument();
          
          // Submit button should be disabled
          const submitButton = screen.getByText('Submit Review');
          expect(submitButton).toBeDisabled();
        } finally {
          unmount();
        }
      }
    });

    it('should accept reviews with valid content mixed with whitespace', async () => {
      const validContentWithWhitespace = [
        '  Great album!  ',
        '\tAmazing production\t',
        '\nLove this album\n',
        '  \t  Really good music  \n  ',
        'Perfect\n\nAbsolutely perfect',
      ];

      for (const content of validContentWithWhitespace) {
        jest.clearAllMocks();
        
        const trimmedContent = content.trim();
        const expectedReview = generateReview(mockUser.id, albumId, trimmedContent);
        const mockOnReviewSubmit = jest.fn();
        
        mockReviewService.createReview.mockResolvedValue(expectedReview);

        const { unmount } = render(
          <ReviewForm
            albumId={albumId}
            onReviewSubmit={mockOnReviewSubmit}
          />
        );

        try {
          const textArea = screen.getByPlaceholderText('Share your thoughts about this album...');
          const submitButton = screen.getByText('Submit Review');

          fireEvent.change(textArea, { target: { value: content } });

          // Submit button should be enabled
          expect(submitButton).not.toBeDisabled();

          fireEvent.click(submitButton);

          await waitFor(() => {
            expect(mockReviewService.createReview).toHaveBeenCalledWith(albumId, content);
            expect(mockOnReviewSubmit).toHaveBeenCalledWith(expectedReview);
          });
        } finally {
          unmount();
        }
      }
    });
  });

  // Additional property: Rating bounds validation
  describe('Rating Bounds Validation', () => {
    it('should only accept ratings between 1 and 5', async () => {
      const mockOnRatingChange = jest.fn();
      
      render(
        <StarRating
          albumId={albumId}
          onRatingChange={mockOnRatingChange}
          averageRating={0}
          totalRatings={0}
        />
      );

      // Should have exactly 5 rating options
      const ratingInputs = screen.getAllByRole('radio');
      expect(ratingInputs).toHaveLength(5);

      // Each rating should be between 1 and 5
      ratingInputs.forEach((input, index) => {
        const value = parseInt(input.getAttribute('value') || '0');
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
        expect(value).toBe(index + 1);
      });
    });
  });
});


