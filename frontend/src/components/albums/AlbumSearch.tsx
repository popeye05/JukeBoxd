import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';
import { Album, SearchResult } from '../../types';
import { albumService } from '../../services/albumService';

interface AlbumSearchProps {
  onAlbumSelect?: (album: Album) => void;
}

export const AlbumSearch: React.FC<AlbumSearchProps> = ({ onAlbumSelect }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result: SearchResult = await albumService.searchAlbums(query.trim());
      setSearchResults(result.albums || []);
    } catch (err: any) {
      console.error('Search error:', err);
      if (err.response?.status === 503 || err.code === 'NETWORK_ERROR') {
        setError('Last.fm API is currently unavailable. Please try again later.');
      } else {
        setError('An error occurred while searching. Please try again.');
      }
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setError(null);
    setHasSearched(false);
  };

  const formatReleaseYear = (releaseDate: string) => {
    try {
      return new Date(releaseDate).getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Box>
      {/* Search Input */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search for albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  onClick={clearSearch}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
          fullWidth
        >
          {loading ? 'Searching...' : 'Search Albums'}
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleSearch}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Empty Results Message */}
      {hasSearched && !loading && !error && searchResults.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            No albums found for "{query}". Try different search terms like:
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
              <li>Different spelling or artist name</li>
              <li>Album title instead of song title</li>
              <li>Partial matches (e.g., "dark side" instead of "The Dark Side of the Moon")</li>
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Search Results ({searchResults.length})
          </Typography>
          
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            {searchResults.map((album) => (
              <Box key={album.spotifyId}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: onAlbumSelect ? 'pointer' : 'default',
                    '&:hover': onAlbumSelect ? {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    } : {},
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onClick={() => onAlbumSelect?.(album)}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={album.imageUrl || '/placeholder-album.svg'}
                    alt={`${album.name} by ${album.artist}`}
                    sx={{ objectFit: 'cover' }}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Typography 
                      variant="h6" 
                      component="h3" 
                      noWrap 
                      title={album.name}
                      sx={{ mb: 1 }}
                    >
                      {album.name}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      noWrap
                      title={album.artist}
                      sx={{ mb: 1 }}
                    >
                      {album.artist}
                    </Typography>
                    
                    <Chip 
                      label={formatReleaseYear(album.releaseDate)}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </CardContent>
                  
                  {album.spotifyUrl && (
                    <CardActions sx={{ pt: 0 }}>
                      <Button 
                        size="small" 
                        href={album.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open in Last.fm
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};