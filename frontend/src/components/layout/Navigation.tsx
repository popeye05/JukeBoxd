import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Home, RssFeed, Person, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const handleFeed = () => {
    navigate('/feed');
    handleClose();
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar position="static" sx={{
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)'
    }}>
      <Toolbar sx={{ minHeight: '64px !important' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 }
          }}
          onClick={() => navigate('/')}
        >
          <img
            src="/logo-landscape.png"
            alt="JukeBoxd"
            style={{
              height: isMobile ? '30px' : '40px',
              width: 'auto',
              marginRight: '10px'
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {isMobile ? (
          // Mobile Menu
          <>
            <IconButton
              color="inherit"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              PaperProps={{
                sx: {
                  backgroundColor: '#1A1A1A',
                  width: 250
                }
              }}
            >
              <List>
                <ListItem onClick={() => { navigate('/'); setMobileMenuOpen(false); }} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon><Home sx={{ color: '#FFD700' }} /></ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItem>
                <ListItem onClick={() => { navigate('/search'); setMobileMenuOpen(false); }} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon><Search sx={{ color: '#FFD700' }} /></ListItemIcon>
                  <ListItemText primary="Search" />
                </ListItem>
                <ListItem onClick={() => { navigate('/discover'); setMobileMenuOpen(false); }} sx={{ cursor: 'pointer' }}>
                  <ListItemIcon><Person sx={{ color: '#FFD700' }} /></ListItemIcon>
                  <ListItemText primary="Discover" />
                </ListItem>
                {user && (
                  <>
                    <ListItem onClick={() => { navigate('/feed'); setMobileMenuOpen(false); }} sx={{ cursor: 'pointer' }}>
                      <ListItemIcon><RssFeed sx={{ color: '#FFD700' }} /></ListItemIcon>
                      <ListItemText primary="Feed" />
                    </ListItem>
                    <ListItem onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} sx={{ cursor: 'pointer' }}>
                      <ListItemIcon><Person sx={{ color: '#FFD700' }} /></ListItemIcon>
                      <ListItemText primary="Profile" />
                    </ListItem>
                    <ListItem onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }} sx={{ cursor: 'pointer' }}>
                      <ListItemText primary="Logout" sx={{ color: '#FF6B6B' }} />
                    </ListItem>
                  </>
                )}
                {!user && (
                  <ListItem onClick={() => { 
                    sessionStorage.setItem('authReturnPath', location.pathname);
                    console.log('Mobile Sign In - storing path:', location.pathname);
                    navigate('/auth', { state: { from: location } }); 
                    setMobileMenuOpen(false); 
                  }} sx={{ cursor: 'pointer' }}>
                    <ListItemText primary="Sign In" sx={{ color: '#FFD700' }} />
                  </ListItem>
                )}
              </List>
            </Drawer>
          </>
        ) : (
          // Desktop Menu
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            onClick={() => navigate('/')}
            startIcon={<Home />}
            sx={{
              borderRadius: 2,
              px: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700'
              }
            }}
          >
            Home
          </Button>

          <Button
            color="inherit"
            onClick={() => navigate('/search')}
            startIcon={<Search />}
            sx={{
              borderRadius: 2,
              px: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700'
              }
            }}
          >
            Search
          </Button>

          <Button
            color="inherit"
            onClick={() => navigate('/discover')}
            startIcon={<Person />}
            sx={{
              borderRadius: 2,
              px: 2,
              '&:hover': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700'
              }
            }}
          >
            Discover
          </Button>

          {user ? (
            <>
              <Button
                color="inherit"
                onClick={() => navigate('/feed')}
                startIcon={<RssFeed />}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    color: '#FFD700'
                  }
                }}
              >
                Feed
              </Button>

              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                sx={{
                  ml: 1,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 215, 0, 0.1)'
                  }
                }}
              >
                <Avatar sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#FFD700',
                  color: '#0A0A0A',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>

              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                sx={{
                  '& .MuiPaper-root': {
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #333333',
                    borderRadius: 2,
                    mt: 1,
                    minWidth: 160
                  }
                }}
              >
                <MenuItem
                  onClick={handleProfile}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      color: '#FFD700'
                    }
                  }}
                >
                  <Person sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Profile
                </MenuItem>
                <MenuItem
                  onClick={handleFeed}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                      color: '#FFD700'
                    }
                  }}
                >
                  <RssFeed sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Feed
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    color: '#FF6B6B',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 107, 107, 0.1)',
                      color: '#FF6B6B'
                    }
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => {
                // Store current path before navigating to auth
                sessionStorage.setItem('authReturnPath', location.pathname);
                console.log('Desktop Sign In - storing path:', location.pathname);
                navigate('/auth', { state: { from: location } });
              }}
              sx={{
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(135deg, #FFD700 0%, #FF6B35 100%)',
                color: '#0A0A0A',
                fontWeight: 700,
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFED4E 0%, #FF8A65 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
                }
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;