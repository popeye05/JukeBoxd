import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FollowButton from './FollowButton';
import { useAuth } from '../../contexts/AuthContext';
import { socialApi } from '../../services/socialApi';

// Mock the auth context
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the social API
jest.mock('../../services/socialApi');
const mockSocialApi = socialApi as jest.Mocked<typeof socialApi>;

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('FollowButton', () => {
  const mockUser = {
    id: 'user1',
    username: 'testuser',
    email: 'test@example.com',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  const mockTargetUser = {
    id: 'user2',
    username: 'targetuser',
    email: 'target@example.com',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false
    });
  });

  it('should not render when user is not logged in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      deleteAccount: jest.fn(),
      loading: false
    });

    const { container } = renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when userId matches current user', () => {
    const { container } = renderWithTheme(
      <FollowButton userId="user1" username="testuser" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show loading state while checking follow status', () => {
    mockSocialApi.isFollowing.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show follow button when not following', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(false);

    renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    await waitFor(() => {
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });
  });

  it('should show unfollow button when following', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(true);

    renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    await waitFor(() => {
      expect(screen.getByText('Unfollow targetuser')).toBeInTheDocument();
    });
  });

  it('should handle follow action successfully', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(false);
    mockSocialApi.followUser.mockResolvedValue({
      follow: {
        id: 'follow1',
        followerId: 'user1',
        followeeId: 'user2',
        createdAt: '2023-01-01T00:00:00Z'
      },
      message: 'Successfully followed user'
    });

    const onFollowChange = jest.fn();

    renderWithTheme(
      <FollowButton 
        userId="user2" 
        username="targetuser" 
        onFollowChange={onFollowChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Follow targetuser'));

    await waitFor(() => {
      expect(mockSocialApi.followUser).toHaveBeenCalledWith('user2');
      expect(onFollowChange).toHaveBeenCalledWith(true);
      expect(screen.getByText('Unfollow targetuser')).toBeInTheDocument();
    });
  });

  it('should handle unfollow action successfully', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(true);
    mockSocialApi.unfollowUser.mockResolvedValue({
      success: true,
      message: 'Successfully unfollowed user'
    });

    const onFollowChange = jest.fn();

    renderWithTheme(
      <FollowButton 
        userId="user2" 
        username="targetuser" 
        onFollowChange={onFollowChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Unfollow targetuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Unfollow targetuser'));

    await waitFor(() => {
      expect(mockSocialApi.unfollowUser).toHaveBeenCalledWith('user2');
      expect(onFollowChange).toHaveBeenCalledWith(false);
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(false);
    mockSocialApi.followUser.mockRejectedValue(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    await waitFor(() => {
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Follow targetuser'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error toggling follow status:', expect.any(Error));
      // Button should still show follow state (no change on error)
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should show loading state during follow action', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(false);
    mockSocialApi.followUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(
      <FollowButton userId="user2" username="targetuser" />
    );

    await waitFor(() => {
      expect(screen.getByText('Follow targetuser')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Follow targetuser'));

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('should support different button sizes and variants', async () => {
    mockSocialApi.isFollowing.mockResolvedValue(false);

    renderWithTheme(
      <FollowButton 
        userId="user2" 
        username="targetuser" 
        size="small"
        variant="outlined"
      />
    );

    await waitFor(() => {
      const button = screen.getByText('Follow targetuser').closest('button');
      expect(button).toHaveClass('MuiButton-sizeSmall');
      expect(button).toHaveClass('MuiButton-outlined');
    });
  });
});


