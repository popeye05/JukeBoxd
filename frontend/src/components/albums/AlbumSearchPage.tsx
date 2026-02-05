import React, { useState } from 'react';
import { Box, Typography, Fade } from '@mui/material';
import { Album } from '../../types';
import { AlbumSearch } from './AlbumSearch';
import { AlbumDetail } from './AlbumDetail';

export const AlbumSearchPage: React.FC = () => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const handleAlbumSelect = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleBackToSearch = () => {
    setSelectedAlbum(null);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Fade in={!selectedAlbum} timeout={300}>
        <Box sx={{ display: selectedAlbum ? 'none' : 'block' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Search Albums
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Discover albums from Last.fm's massive music database. Click on any album to see ratings and reviews.
          </Typography>
          
          <AlbumSearch onAlbumSelect={handleAlbumSelect} />
        </Box>
      </Fade>

      <Fade in={!!selectedAlbum} timeout={300}>
        <Box sx={{ display: selectedAlbum ? 'block' : 'none' }}>
          {selectedAlbum && (
            <AlbumDetail 
              album={selectedAlbum} 
              onClose={handleBackToSearch}
            />
          )}
        </Box>
      </Fade>
    </Box>
  );
};