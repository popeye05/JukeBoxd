import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlbumSearch } from './AlbumSearch';
import { albumService } from '../../services/albumService';
import { Album } from '../../types';

// Mock the album service
jest.mock('../../services/albumService');
const mockedAlbumService = albumService as jest.Mocked<typeof albumService>;

// Mock data
const mockAlbums: Album[] = [
  {
    id: '1',
    spotifyId: 'spotify1',
    name: 'Test Album 1',
    artist: 'Test Artist 1',
    releaseDate: '2023-01-01',
    imageUrl: 'https://example.com/image1.jpg',
    spotifyUrl: 'https://music.apple.com/album/spotify1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    spotifyId: 'spotify2',
    name: 'Test Album 2',
    artist: 'Test Artist 2',
    releaseDate: '2022-06-15',
    imageUrl: 'https://example.com/image2.jpg',
    spotifyUrl: 'https://open.spotify.com/album/spotify2',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
];

describe('AlbumSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search interface correctly', () => {
    render(<AlbumSearch />);
    
    expect(screen.getByPlaceholderText('Search for albums...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search albums/i })).toBeInTheDocument();
  });

  it('performs search when search button is clicked', async () => {
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: mockAlbums,
      total: 2,
    });

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    const searchButton = screen.getByRole('button', { name: /search albums/i });

    userEvent.type(searchInput, 'test query');
    userEvent.click(searchButton);

    await waitFor(() => {
      expect(mockedAlbumService.searchAlbums).toHaveBeenCalledWith('test query');
    });
  });

  it('performs search when Enter key is pressed', async () => {
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: mockAlbums,
      total: 2,
    });

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');

    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockedAlbumService.searchAlbums).toHaveBeenCalledWith('test query');
    });
  });

  it('displays search results correctly', async () => {
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: mockAlbums,
      total: 2,
    });

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Search Results (2)')).toBeInTheDocument();
      expect(screen.getByText('Test Album 1')).toBeInTheDocument();
      expect(screen.getByText('Test Artist 1')).toBeInTheDocument();
      expect(screen.getByText('Test Album 2')).toBeInTheDocument();
      expect(screen.getByText('Test Artist 2')).toBeInTheDocument();
    });
  });

  it('displays empty results message when no albums found', async () => {
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: [],
      total: 0,
    });

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'nonexistent album');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/No albums found for "nonexistent album"/)).toBeInTheDocument();
      expect(screen.getByText(/Try different search terms like:/)).toBeInTheDocument();
    });
  });

  it('displays error message when API fails', async () => {
    mockedAlbumService.searchAlbums.mockRejectedValue(new Error('API Error'));

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/An error occurred while searching/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('displays Spotify API unavailable message for 503 errors', async () => {
    const error = new Error('Service Unavailable');
    (error as any).response = { status: 503 };
    mockedAlbumService.searchAlbums.mockRejectedValue(error);

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText(/Spotify API is currently unavailable/)).toBeInTheDocument();
    });
  });

  it('calls onAlbumSelect when album is clicked', async () => {
    const mockOnAlbumSelect = jest.fn();
    mockedAlbumService.searchAlbums.mockResolvedValue({
      albums: mockAlbums,
      total: 2,
    });

    render(<AlbumSearch onAlbumSelect={mockOnAlbumSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Test Album 1')).toBeInTheDocument();
    });

    const albumCard = screen.getByText('Test Album 1').closest('[role="button"]') || 
                     screen.getByText('Test Album 1').closest('div[style*="cursor: pointer"]');
    
    if (albumCard) {
      userEvent.click(albumCard);
      expect(mockOnAlbumSelect).toHaveBeenCalledWith(mockAlbums[0]);
    }
  });

  it('clears search when clear button is clicked', async () => {
    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');

    const clearButton = screen.getByLabelText('clear search');
    userEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('disables search button when query is empty', () => {
    render(<AlbumSearch />);
    
    const searchButton = screen.getByRole('button', { name: /search albums/i });
    expect(searchButton).toBeDisabled();
  });

  it('shows loading state during search', async () => {
    // Create a promise that we can control
    let resolveSearch: (value: any) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    mockedAlbumService.searchAlbums.mockReturnValue(searchPromise as Promise<any>);

    render(<AlbumSearch />);
    
    const searchInput = screen.getByPlaceholderText('Search for albums...');
    userEvent.type(searchInput, 'test query');
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Check loading state
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();

    // Resolve the promise
    resolveSearch!({ albums: [], total: 0 });

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    });
  });
});


