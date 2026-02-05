import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlbumSearchPage } from './AlbumSearchPage';
import { albumService } from '../../services/albumService';
import { Album } from '../../types';

// Mock the album service
jest.mock('../../services/albumService');
const mockedAlbumService = albumService as jest.Mocked<typeof albumService>;

// Mock data
const mockAlbum: Album = {
  id: '1',
  spotifyId: 'spotify1',
  name: 'Test Album',
  artist: 'Test Artist',
  releaseDate: '2023-01-01',
  imageUrl: 'https://example.com/image.jpg',
  spotifyUrl: 'https://music.apple.com/album/spotify1',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

describe('AlbumSearchPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search page initially', () => {
    render(<AlbumSearchPage />);
    
    expect(screen.getByText('Search Albums')).toBeInTheDocument();
    expect(screen.getByText(/Discover albums from Last\.fm's massive music database/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search for albums...')).toBeInTheDocument();
  });

  it('transitions to album detail view when album is selected', async () => {
    // Mock search results
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: [mockAlbum],
      total: 1,
    });
    
    // Mock album detail data
    mockedAlbumService.getAlbumRatings.mockResolvedValue([]);
    mockedAlbumService.getAlbumReviews.mockResolvedValue([]);

    render(<AlbumSearchPage />);
    
    // Perform search
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test album');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    // Click on album to view details
    const albumCard = screen.getByText('Test Album').closest('div[style*="cursor: pointer"]');
    if (albumCard) {
      userEvent.click(albumCard);
    }

    // Should now show album detail view
    await waitFor(() => {
      expect(screen.getByText('Back to Search')).toBeInTheDocument();
      expect(screen.getByText('by Test Artist')).toBeInTheDocument();
    });

    // Search interface should be hidden
    expect(screen.queryByText('Search Albums')).not.toBeInTheDocument();
  });

  it('returns to search view when back button is clicked', async () => {
    // Mock search results
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: [mockAlbum],
      total: 1,
    });
    
    // Mock album detail data
    mockedAlbumService.getAlbumRatings.mockResolvedValue([]);
    mockedAlbumService.getAlbumReviews.mockResolvedValue([]);

    render(<AlbumSearchPage />);
    
    // Perform search and select album
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test album');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    const albumCard = screen.getByText('Test Album').closest('div[style*="cursor: pointer"]');
    if (albumCard) {
      userEvent.click(albumCard);
    }

    // Should show album detail view
    await waitFor(() => {
      expect(screen.getByText('Back to Search')).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByRole('button', { name: /back to search/i });
    userEvent.click(backButton);

    // Should return to search view
    await waitFor(() => {
      expect(screen.getByText('Search Albums')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search for albums...')).toBeInTheDocument();
    });

    // Album detail should be hidden
    expect(screen.queryByText('Back to Search')).not.toBeInTheDocument();
  });

  it('maintains search state when returning from album detail', async () => {
    // Mock search results
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: [mockAlbum],
      total: 1,
    });
    
    // Mock album detail data
    mockedAlbumService.getAlbumRatings.mockResolvedValue([]);
    mockedAlbumService.getAlbumReviews.mockResolvedValue([]);

    render(<AlbumSearchPage />);
    
    // Perform search
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test album');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
    });

    // Select album
    const albumCard = screen.getByText('Test Album').closest('div[style*="cursor: pointer"]');
    if (albumCard) {
      userEvent.click(albumCard);
    }

    await waitFor(() => {
      expect(screen.getByText('Back to Search')).toBeInTheDocument();
    });

    // Go back
    const backButton = screen.getByRole('button', { name: /back to search/i });
    userEvent.click(backButton);

    // Search results should still be visible
    await waitFor(() => {
      expect(screen.getByText('Search Results (1)')).toBeInTheDocument();
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    // Search input should maintain its value
    expect(screen.getByDisplayValue('test album')).toBeInTheDocument();
  });
});


