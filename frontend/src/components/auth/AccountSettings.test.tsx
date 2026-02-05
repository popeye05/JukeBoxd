import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AccountSettings from './AccountSettings';
import { AuthProvider } from '../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the auth context
const mockDeleteAccount = jest.fn();
const mockUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => ({
    user: mockUser,
    deleteAccount: mockDeleteAccount,
    token: 'mock-token',
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

const theme = createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AccountSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render account information', () => {
    renderWithProviders(<AccountSettings />);

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Account Information')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('1/1/2023')).toBeInTheDocument();
  });

  it('should render danger zone with delete account button', () => {
    renderWithProviders(<AccountSettings />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('should open delete confirmation dialog when delete button is clicked', () => {
    renderWithProviders(<AccountSettings />);

    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('This action will permanently delete your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type DELETE to confirm')).toBeInTheDocument();
  });

  it('should require DELETE confirmation text', () => {
    renderWithProviders(<AccountSettings />);

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    // Try to delete without typing DELETE
    const confirmButton = screen.getByRole('button', { name: /delete account/i });
    expect(confirmButton).toBeDisabled();

    // Type incorrect text
    const textField = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(textField, { target: { value: 'delete' } });
    expect(confirmButton).toBeDisabled();

    // Type correct text
    fireEvent.change(textField, { target: { value: 'DELETE' } });
    expect(confirmButton).not.toBeDisabled();
  });

  it('should call deleteAccount when confirmed', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    renderWithProviders(<AccountSettings />);

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    // Type confirmation text
    const textField = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(textField, { target: { value: 'DELETE' } });

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
  });

  it('should show error message on deletion failure', async () => {
    const errorMessage = 'Account deletion failed';
    mockDeleteAccount.mockRejectedValue({
      response: { data: { error: { message: errorMessage } } }
    });

    renderWithProviders(<AccountSettings />);

    // Open dialog and confirm deletion
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    const textField = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(textField, { target: { value: 'DELETE' } });

    const confirmButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should close dialog when cancel is clicked', () => {
    renderWithProviders(<AccountSettings />);

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show loading state during deletion', async () => {
    // Mock a delayed response
    mockDeleteAccount.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderWithProviders(<AccountSettings />);

    // Open dialog and confirm deletion
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    const textField = screen.getByPlaceholderText('Type DELETE to confirm');
    fireEvent.change(textField, { target: { value: 'DELETE' } });

    const confirmButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(confirmButton);

    // Check loading state
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
  });

  it('should display data handling information', () => {
    renderWithProviders(<AccountSettings />);

    // Open dialog
    const deleteButton = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteButton);

    expect(screen.getByText('Your personal information will be permanently deleted')).toBeInTheDocument();
    expect(screen.getByText(/Your ratings and reviews will be anonymized/)).toBeInTheDocument();
    expect(screen.getByText('All follow relationships will be removed')).toBeInTheDocument();
  });
});


