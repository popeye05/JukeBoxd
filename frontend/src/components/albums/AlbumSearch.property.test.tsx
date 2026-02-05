import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlbumSearch } from './AlbumSearch';
import { albumService } from '../../services/albumService';
import { Album, SearchResult } from '../../types';

// Feature: jukeboxd, Property 1: Album Search Completeness
// **Validates: Requirements 1.1, 1.2**

// Mock the album service
jest.mock('../../services/albumService');
const mockedAlbumService = albumService as jest.Mocked<typeof albumService>;

// Property test generators
const generateRandomString = (length: number = Math.floor(Math.random() * 20) + 1): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const generateAlbum = (index: number): Album => ({
  id: `album-${index}`,
  spotifyId: `spotify-${index}`,
  name: `Album ${index} ${generateRandomString(10)}`,
  artist: `Artist ${index} ${generateRandomString(8)}`,
  releaseDate: `${2000 + Math.floor(Math.random() * 24)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
  imageUrl: Math.random() > 0.3 ? `https://example.com/image${index}.jpg` : '',
  spotifyUrl: `https://open.spotify.com/album/spotify-${index}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const generateSearchResult = (albumCount: number): SearchResult => ({
  albums: Array.from({ length: albumCount }, (_, i) => generateAlbum(i)),
  total: albumCount,
});

describe('AlbumSearch Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Property 1: Album Search Completeness
  // For any search query, the system should retrieve matching albums from Spotify API 
  // and display them with complete information (title, artist, release year, cover art)
  describe('Property 1: Album Search Completeness', () => {
    const testCases = [
      { query: 'rock', albumCount: 0 },
      { query: 'jazz', albumCount: 1 },
      { query: 'classical', albumCount: 5 },
      { query: 'pop music', albumCount: 10 },
      { query: 'electronic dance', albumCount: 20 },
      { query: 'a', albumCount: 3 },
      { query: 'the beatles', albumCount: 15 },
      { query: '2023', albumCount: 8 },
      { query: 'album with very long name that might cause issues', albumCount: 2 },
      { query: '!@#$%^&*()', albumCount: 0 },
    ];

    testCases.forEach(({ query, albumCount }) => {
      it(`should display complete album information for query "${query}" with ${albumCount} results`, async () => {
        // Arrange
        const searchResult = generateSearchResult(albumCount);
        mockedAlbumService.searchAlbums.mockResolvedValue(searchResult);

        // Act
        render(<AlbumSearch />);
        const searchInput = screen.getByPlaceholderText('Search for albums...');
        
        // Simulate user typing and searching
        fireEvent.change(searchInput, { target: { value: query } });
        fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

        // Assert
        await waitFor(() => {
          expect(mockedAlbumService.searchAlbums).toHaveBeenCalledWith(query.trim());
        });

        if (albumCount === 0) {
          // Should show empty results message
          await waitFor(() => {
            expect(screen.getByText(new RegExp(`No albums found for "${query.trim()}"`))).toBeInTheDocument();
          });
        } else {
          // Should show search results with count
          await waitFor(() => {
            expect(screen.getByText(`Search Results (${albumCount})`)).toBeInTheDocument();
          });

          // Verify each album displays complete information
          searchResult.albums.forEach((album) => {
            // Album name should be displayed
            expect(screen.getByText(album.name)).toBeInTheDocument();
            
            // Artist name should be displayed
            expect(screen.getByText(album.artist)).toBeInTheDocument();
            
            // Release year should be displayed
            const releaseYear = new Date(album.releaseDate).getFullYear().toString();
            expect(screen.getByText(releaseYear)).toBeInTheDocument();
            
            // Album image should be present (either actual image or placeholder)
            const albumImages = screen.getAllByRole('img');
            const albumImage = albumImages.find(img => 
              img.getAttribute('alt')?.includes(album.name) && 
              img.getAttribute('alt')?.includes(album.artist)
            );
            expect(albumImage).toBeInTheDocument();
            
            // Image should have correct src (either provided URL or placeholder)
            if (albumImage) {
              const expectedSrc = album.imageUrl || '/placeholder-album.svg';
              expect(albumImage).toHaveAttribute('src', expectedSrc);
            }
            
            // Last.fm link should be present if spotifyUrl exists
            if (album.spotifyUrl) {
              const lastFmLinks = screen.getAllByRole('link', { name: /open in last\.fm/i });
              const albumLastFmLink = lastFmLinks.find(link => 
                link.getAttribute('href') === album.spotifyUrl
              );
              expect(albumLastFmLink).toBeInTheDocument();
              expect(albumLastFmLink).toHaveAttribute('target', '_blank');
            }
          });
        }
      });
    });

    // Property test with random data generation
    it('should handle any valid search query and display complete album information', async () => {
      // Generate multiple test iterations
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        jest.clearAllMocks();
        
        // Generate random test data
        const query = generateRandomString(Math.floor(Math.random() * 30) + 1).trim();
        const albumCount = Math.floor(Math.random() * 25);
        const searchResult = generateSearchResult(albumCount);
        
        // Skip empty queries as they're handled by the UI
        if (!query) continue;
        
        mockedAlbumService.searchAlbums.mockResolvedValue(searchResult);

        // Render fresh component for each iteration
        const { unmount } = render(<AlbumSearch />);
        
        try {
          const searchInput = screen.getByPlaceholderText('Search for albums...');
          
          // Perform search
          fireEvent.change(searchInput, { target: { value: query } });
          fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

          // Verify API was called correctly
          await waitFor(() => {
            expect(mockedAlbumService.searchAlbums).toHaveBeenCalledWith(query);
          });

          if (albumCount === 0) {
            // Should show empty results message
            await waitFor(() => {
              expect(screen.getByText(new RegExp(`No albums found for "${query}"`))).toBeInTheDocument();
            });
          } else {
            // Should show search results
            await waitFor(() => {
              expect(screen.getByText(`Search Results (${albumCount})`)).toBeInTheDocument();
            });

            // Verify all albums have required information displayed
            searchResult.albums.forEach((album) => {
              expect(screen.getByText(album.name)).toBeInTheDocument();
              expect(screen.getByText(album.artist)).toBeInTheDocument();
              
              const releaseYear = new Date(album.releaseDate).getFullYear().toString();
              expect(screen.getByText(releaseYear)).toBeInTheDocument();
            });
          }
        } finally {
          unmount();
        }
      }
    });

    // Edge case: Search with whitespace handling
    it('should handle queries with leading/trailing whitespace correctly', async () => {
      const baseQuery = 'test album';
      const queries = [
        `  ${baseQuery}  `,
        `\t${baseQuery}\t`,
        `\n${baseQuery}\n`,
        ` \t ${baseQuery} \t `,
      ];

      for (const query of queries) {
        jest.clearAllMocks();
        const searchResult = generateSearchResult(3);
        mockedAlbumService.searchAlbums.mockResolvedValue(searchResult);

        const { unmount } = render(<AlbumSearch />);
        
        try {
          const searchInput = screen.getByPlaceholderText('Search for albums...');
          
          fireEvent.change(searchInput, { target: { value: query } });
          fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });

          // Should call API with trimmed query
          await waitFor(() => {
            expect(mockedAlbumService.searchAlbums).toHaveBeenCalledWith(baseQuery);
          });

          // Should display results
          await waitFor(() => {
            expect(screen.getByText('Search Results (3)')).toBeInTheDocument();
          });
        } finally {
          unmount();
        }
      }
    });
  });
});


