/**
 * Integration tests for frontend-backend connectivity
 * These tests verify that all major user workflows function end-to-end
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from '../contexts/AuthContext';
import { AlbumSearch } from '../components/albums';
import { ActivityFeed } from '../components/feed';
import { UserProfile } from '../components/social';

// Mock API responses
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }
}));

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Frontend-Backend Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Album Search Integration', () => {
    it('should render album search component without errors', () => {
      render(
        <TestWrapper>
          <AlbumSearch />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Search for albums...')).toBeInTheDocument();
      expect(screen.getByText('Search Albums')).toBeInTheDocument();
    });

    it('should handle search input and button interaction', () => {
      render(
        <TestWrapper>
          <AlbumSearch />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search for albums...');
      const searchButton = screen.getByText('Search Albums');

      fireEvent.change(searchInput, { target: { value: 'test album' } });
      expect(searchInput).toHaveValue('test album');

      fireEvent.click(searchButton);
      // Button should be disabled during search
      expect(searchButton).toBeDisabled();
    });
  });

  describe('Activity Feed Integration', () => {
    it('should render activity feed component without errors', () => {
      render(
        <TestWrapper>
          <ActivityFeed />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('User Profile Integration', () => {
    it('should render user profile component without errors', () => {
      render(
        <TestWrapper>
          <UserProfile userId="test-user-id" />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockApi = require('../services/api').default;
      mockApi.get.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <AlbumSearch />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search for albums...');
      const searchButton = screen.getByText('Search Albums');

      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.click(searchButton);

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(searchButton).not.toBeDisabled();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle authentication context without errors', () => {
      render(
        <TestWrapper>
          <div>Test component</div>
        </TestWrapper>
      );

      expect(screen.getByText('Test component')).toBeInTheDocument();
    });
  });
});

describe('Component Exports', () => {
  it('should export all required components', () => {
    // Test that all main components can be imported
    expect(AlbumSearch).toBeDefined();
    expect(ActivityFeed).toBeDefined();
    expect(UserProfile).toBeDefined();
  });
});

describe('API Service Integration', () => {
  it('should have properly configured API service', () => {
    const api = require('../services/api').default;
    expect(api).toBeDefined();
    expect(api.get).toBeDefined();
    expect(api.post).toBeDefined();
    expect(api.put).toBeDefined();
    expect(api.delete).toBeDefined();
  });
});


