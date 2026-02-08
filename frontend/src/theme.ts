import { createTheme } from '@mui/material/styles';

// JukeBoxd brand colors from the logo
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFD700', // Yellow from the logo dot
      light: '#FFED4E',
      dark: '#B8860B',
      contrastText: '#000000',
    },
    secondary: {
      main: '#40bcf4', // Letterboxd Blue/Greenish
      light: '#66cfff',
      dark: '#008ba3',
    },
    background: {
      default: '#14181c', // Letterboxd Dark Grey
      paper: '#1e2328', // Slightly lighter grey
    },
    text: {
      primary: '#ffffff',
      secondary: '#9ab', // Cool grey
    },
    divider: '#2c3440',
    error: {
      main: '#ff8040', // Orange-red
    },
    warning: {
      main: '#FFD700', // Use brand yellow for warnings
    },
    info: {
      main: '#2196F3', // Teal from the logo bars
    },
    success: {
      main: '#4CAF50',
    },

  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
      color: '#FFFFFF',
    },
    h2: {
      fontWeight: 800,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
      color: '#FFFFFF',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.75rem',
      color: '#FFFFFF',
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.5rem',
      color: '#FFFFFF',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.25rem',
      color: '#FFFFFF',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1rem',
      color: '#FFFFFF',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
      color: '#FFFFFF',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#CCCCCC',
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
      fontSize: '0.9375rem',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
          minHeight: '100vh',
          color: '#FFFFFF',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A1A',
          backgroundImage: 'none',
          borderRadius: 8,
          border: '1px solid #333333',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(255, 215, 0, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '0.9375rem',
          textTransform: 'none',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          color: '#000000',
          fontWeight: 800,
          '&:hover': {
            background: 'linear-gradient(135deg, #FFED4E 0%, #FFB347 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A65 100%)',
          color: '#FFFFFF',
          '&:hover': {
            background: 'linear-gradient(135deg, #FF8A65 0%, #FFAB91 100%)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            '& fieldset': {
              borderColor: '#333333',
            },
            '&:hover fieldset': {
              borderColor: '#555555',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FFD700',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#CCCCCC',
            '&.Mui-focused': {
              color: '#FFD700',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
        },
        filled: {
          backgroundColor: '#333333',
          color: '#FFFFFF',
        },
        filledPrimary: {
          backgroundColor: '#FFD700',
          color: '#000000',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
          borderBottom: '1px solid #333333',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
        },
      },
    },
    MuiRating: {
      styleOverrides: {
        root: {
          color: '#FFD700', // Use brand yellow for stars
        },
        iconEmpty: {
          color: '#555555',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFD700',
          color: '#000000',
          fontWeight: 800,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardError: {
          backgroundColor: '#2C1F1F',
          color: '#FF6B6B',
          border: '1px solid #FF6B6B33',
        },
        standardWarning: {
          backgroundColor: '#2C2A1F',
          color: '#FFD700',
          border: '1px solid #FFD70033',
        },
        standardInfo: {
          backgroundColor: '#1F2A2C',
          color: '#2196F3',
          border: '1px solid #2196F333',
        },
        standardSuccess: {
          backgroundColor: '#1F2C21',
          color: '#4CAF50',
          border: '1px solid #4CAF5033',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.9375rem',
          color: '#CCCCCC',
          '&.Mui-selected': {
            color: '#FFD700',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#FFD700',
          height: 3,
        },
      },
    },
  },
});
