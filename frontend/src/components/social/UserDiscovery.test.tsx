import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserDiscovery from './UserDiscovery';
import { socialApi } from '../../services/socialApi';

// Mock the social API
jest.mock('../../services/socialApi');
const mockSocialApi = socialApi as jest.Mocked<typeof socialApi>;

// Mock the UserProfile component
jest.mock('./UserProfile', () => {
  return function MockUserProfile({ userId, compact }: { userId: string; compact: boolean }) {
    return (
      <div data-testid={`user-profile-${userId}`}>
        User Profile {userId} {compact ? '(compact)' : '(full)'}
      </div>
    );
  };
});

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('UserDiscovery', () => {
  const mockUsers = [
    {
      id: 'user1',
      username: 'user1',
      email: 'user1@example.com',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    },
    {
      id: 'user2',
      username: 'user2',
      email: 'user2@example.com',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z'
    },
    {
      id: 'user3',
      username: 'user3',
      email: 'user3@example.com',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state while fetching users', () => {
    mockSocialApi.getUserSuggestions.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(<UserDiscovery />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display user suggestions', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Discover Users')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-user1')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-user2')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-user3')).toBeInTheDocument();
    });
  });

  it('should use custom title', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery title="Find New Friends" />);

    await waitFor(() => {
      expect(screen.getByText('Find New Friends')).toBeInTheDocument();
    });
  });

  it('should respect limit parameter', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers.slice(0, 2));

    renderWithTheme(<UserDiscovery limit={2} />);

    await waitFor(() => {
      expect(mockSocialApi.getUserSuggestions).toHaveBeenCalledWith(2);
      expect(screen.getByTestId('user-profile-user1')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-user2')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile-user3')).not.toBeInTheDocument();
    });
  });

  it('should show refresh button when enabled', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery showRefresh={true} />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('should hide refresh button when disabled', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery showRefresh={false} />);

    await waitFor(() => {
      expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
    });
  });

  it('should handle refresh action', async () => {
    mockSocialApi.getUserSuggestions
      .mockResolvedValueOnce(mockUsers.slice(0, 2))
      .mockResolvedValueOnce(mockUsers);

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-user1')).toBeInTheDocument();
      expect(screen.getByTestId('user-profile-user2')).toBeInTheDocument();
      expect(screen.queryByTestId('user-profile-user3')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(mockSocialApi.getUserSuggestions).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('user-profile-user3')).toBeInTheDocument();
    });
  });

  it('should show refreshing state during refresh', async () => {
    mockSocialApi.getUserSuggestions
      .mockResolvedValueOnce(mockUsers)
      .mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    const errorMessage = 'Failed to load user suggestions';
    mockSocialApi.getUserSuggestions.mockRejectedValue({
      response: {
        data: {
          error: {
            message: errorMessage
          }
        }
      }
    });

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should handle generic API errors', async () => {
    mockSocialApi.getUserSuggestions.mockRejectedValue(new Error('Network error'));

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load user suggestions')).toBeInTheDocument();
    });
  });

  it('should show empty state when no users available', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue([]);

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('No users to discover')).toBeInTheDocument();
      expect(screen.getByText('It looks like you\'ve already connected with everyone!')).toBeInTheDocument();
    });
  });

  it('should show limit message when users equal limit', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery limit={3} />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 3 users/)).toBeInTheDocument();
      expect(screen.getByText(/Follow some users to see more personalized suggestions!/)).toBeInTheDocument();
    });
  });

  it('should not show limit message when users less than limit', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers.slice(0, 2));

    renderWithTheme(<UserDiscovery limit={5} />);

    await waitFor(() => {
      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });
  });

  it('should render user profiles in compact mode', async () => {
    mockSocialApi.getUserSuggestions.mockResolvedValue(mockUsers);

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('User Profile user1 (compact)')).toBeInTheDocument();
      expect(screen.getByText('User Profile user2 (compact)')).toBeInTheDocument();
      expect(screen.getByText('User Profile user3 (compact)')).toBeInTheDocument();
    });
  });

  it('should retry on error', async () => {
    mockSocialApi.getUserSuggestions
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockUsers);

    renderWithTheme(<UserDiscovery />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load user suggestions')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-user1')).toBeInTheDocument();
    });
  });
});


