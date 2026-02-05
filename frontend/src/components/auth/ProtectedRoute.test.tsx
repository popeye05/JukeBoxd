import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API
jest.mock('../../services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

const theme = createTheme();

const TestComponent = () => <div>Protected Content</div>;

const renderWithProviders = (component: React.ReactElement, initialEntries = ['/protected']) => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<div>Auth Page</div>} />
            <Route path="/protected" element={component} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

// Mock the AuthContext
const mockAuthContext = {
  user: null as any,
  token: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  deleteAccount: jest.fn(),
  loading: false,
};

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuthContext,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
  });

  it('shows loading spinner when auth is loading', () => {
    mockAuthContext.loading = true;
    
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockAuthContext.user = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01'
    };
    
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to auth page when user is not authenticated', () => {
    mockAuthContext.user = null;
    
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    // Should redirect to auth page
    expect(screen.getByText('Auth Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});


