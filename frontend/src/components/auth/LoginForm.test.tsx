import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoginForm from './LoginForm';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the API
jest.mock('../../services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with all required fields', () => {
    renderWithProviders(<LoginForm />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error for empty fields', async () => {
    renderWithProviders(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('shows validation error for whitespace-only username', async () => {
    renderWithProviders(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: '   ' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    const api = require('../../services/api');
    api.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithProviders(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Check that form is disabled during submission
    expect(usernameInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('shows switch to register link when callback provided', () => {
    const mockSwitch = jest.fn();
    renderWithProviders(<LoginForm onSwitchToRegister={mockSwitch} />);
    
    const switchLink = screen.getByText('Sign up');
    expect(switchLink).toBeInTheDocument();
    
    fireEvent.click(switchLink);
    expect(mockSwitch).toHaveBeenCalled();
  });

  it('does not show switch link when callback not provided', () => {
    renderWithProviders(<LoginForm />);
    
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
  });

  it('trims username input before submission', async () => {
    const api = require('../../services/api');
    api.post.mockResolvedValue({
      data: {
        data: {
          token: 'test-token',
          user: { id: '1', username: 'testuser', email: 'test@example.com' }
        }
      }
    });

    renderWithProviders(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: '  testuser  ' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123'
      });
    });
  });
});


