import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import { favoritesService, FavoriteAlbum } from '../../services/favoritesService';
import { albumService } from '../../services/albumService';
import { Album } from '../../types';

interface FavoriteAlbumsProps {
  userId: string;
  isOwnProfile: boolean;
}

const FavoriteAlbums: React.FC<FavoriteAlbumsProps> = ({ userId, isOwnProfile }) => {
  const [favorites, setFavorites] = useState<FavoriteAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayedFavorites = showAll ? favorites : favorites.slice(0, 10);

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const data = await favoritesService.getUserFavorites(userId);
      setFavorites(data);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load favorite albums');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const result = await albumService.searchAlbums(searchQuery);
      setSearchResults(result.albums);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFavorite = async (album: Album) => {
    try {
      // First, ensure the album exists in our database by fetching it
      // This will create it if it doesn't exist
      const albumDetails = await albumService.getAlbum(album.spotifyId);
      
      // Now add to favorites using the database ID
      await favoritesService.addFavorite(albumDetails.id);
      await fetchFavorites();
      setAddDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Error adding favorite:', err);
      alert(err.response?.data?.error?.message || 'Failed to add favorite');
    }
  };

  const handleRemoveFavorite = async (albumId: string) => {
    try {
      await favoritesService.removeFavorite(albumId);
      await fetchFavorites();
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const newFavorites = [...favorites];
    [newFavorites[index - 1], newFavorites[index]] = [newFavorites[index], newFavorites[index - 1]];
    
    const updates = newFavorites.map((fav, idx) => ({
      albumId: fav.albumId,
      rank: idx + 1
    }));
    
    try {
      await favoritesService.reorderFavorites(updates);
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  const moveDown = async (index: number) => {
    if (index === favorites.length - 1) return;
    
    const newFavorites = [...favorites];
    [newFavorites[index], newFavorites[index + 1]] = [newFavorites[index + 1], newFavorites[index]];
    
    const updates = newFavorites.map((fav, idx) => ({
      albumId: fav.albumId,
      rank: idx + 1
    }));
    
    try {
      await favoritesService.reorderFavorites(updates);
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Top Favorite Albums</Typography>
          {isOwnProfile && (
            <Box>
              {favorites.length > 0 && (
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => setEditMode(!editMode)}
                  sx={{ mr: 1 }}
                >
                  {editMode ? 'Done' : 'Edit'}
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Album
              </Button>
            </Box>
          )}
        </Box>

        {favorites.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body2" color="text.secondary">
              {isOwnProfile ? 'Add your favorite albums to showcase them on your profile!' : 'No favorite albums yet'}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(3, 1fr)',
                sm: 'repeat(4, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: { xs: 1, sm: 2 }
            }}>
              {displayedFavorites.map((favorite, index) => (
              <Box key={favorite.id}>
                <Card variant="outlined" sx={{ position: 'relative' }}>
                  <Box sx={{ position: 'relative', paddingTop: '100%' }}>
                    <CardMedia
                      component="img"
                      image={favorite.album?.imageUrl || '/placeholder-album.svg'}
                      alt={favorite.album?.name}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: { xs: 4, sm: 8 },
                        left: { xs: 4, sm: 8 },
                        bgcolor: 'primary.main',
                        color: 'black',
                        borderRadius: '50%',
                        width: { xs: 24, sm: 32 },
                        height: { xs: 24, sm: 32 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', sm: '1rem' }
                      }}
                    >
                      {index + 1}
                    </Box>
                    {editMode && isOwnProfile && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          bgcolor: 'rgba(0,0,0,0.7)',
                          borderRadius: 1
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          sx={{ color: 'white' }}
                        >
                          ▲
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => moveDown(index)}
                          disabled={index === favorites.length - 1}
                          sx={{ color: 'white' }}
                        >
                          ▼
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFavorite(favorite.albumId)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                  <CardContent sx={{ p: { xs: 0.5, sm: 1 } }}>
                    <Typography 
                      variant="caption" 
                      noWrap 
                      display="block" 
                      fontWeight="bold"
                      sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                    >
                      {favorite.album?.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      noWrap 
                      display="block" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}
                    >
                      {favorite.album?.artist}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>

          {favorites.length > 10 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `See More (${favorites.length - 10} more)`}
              </Button>
            </Box>
          )}
        </>
        )}

        {/* Add Album Dialog */}
        <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Add Favorite Album</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <input
                type="text"
                placeholder="Search for albums..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #555',
                  backgroundColor: '#1a1a1a',
                  color: 'white'
                }}
              />
              <Button variant="contained" onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </Box>

            {searchResults.length > 0 && (
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                },
                gap: 2
              }}>
                {searchResults.map((album) => (
                  <Box key={album.spotifyId}>
                    <Card
                      sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.02)' } }}
                      onClick={() => handleAddFavorite(album)}
                    >
                      <CardMedia
                        component="img"
                        height="150"
                        image={album.imageUrl || '/placeholder-album.svg'}
                        alt={album.name}
                      />
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" noWrap display="block">
                          {album.name}
                        </Typography>
                        <Typography variant="caption" noWrap display="block" color="text.secondary">
                          {album.artist}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default FavoriteAlbums;
