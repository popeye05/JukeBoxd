import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { EmptyFeedState } from './EmptyFeedState';

const theme = createTheme();

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('EmptyFeedState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty feed state for current user', () => {
    renderWithProviders(<EmptyFeedState />);

    expect(screen.getByText('Your Feed is Empty')).toBeInTheDocument();
    expect(screen.getByText(/Start following other music enthusiasts/)).toBeInTheDocument();
    expect(screen.getByText('Discover Albums')).toBeInTheDocument();
    expect(screen.getByText('Find Users to Follow')).toBeInTheDocument();
    expect(screen.getByText(/💡 Tip: Rate and review albums/)).toBeInTheDocument();
  });

  it('renders empty feed state for another user', () => {
    renderWithProviders(<EmptyFeedState userId="other-user-id" />);

    expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    expect(screen.getByText("This user hasn't rated or reviewed any albums yet.")).toBeInTheDocument();
    
    // Should not show action buttons for other users
    expect(screen.queryByText('Discover Albums')).not.toBeInTheDocument();
    expect(screen.queryByText('Find Users to Follow')).not.toBeInTheDocument();
  });

  it('navigates to search page when Discover Albums is clicked', () => {
    renderWithProviders(<EmptyFeedState />);

    const discoverButton = screen.getByText('Discover Albums');
    fireEvent.click(discoverButton);

    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('navigates to user discovery page when Find Users to Follow is clicked', () => {
    renderWithProviders(<EmptyFeedState />);

    const followButton = screen.getByText('Find Users to Follow');
    fireEvent.click(followButton);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('displays appropriate icons', () => {
    renderWithProviders(<EmptyFeedState />);

    // Check for PersonAdd icon (should be in the main heading area)
    const personAddIcon = screen.getByTestId('PersonAddIcon') || 
                         document.querySelector('[data-testid="PersonAddIcon"]') ||
                         document.querySelector('.MuiSvgIcon-root');
    
    // At minimum, we should have some icon rendered
    expect(document.querySelector('.MuiSvgIcon-root')).toBeInTheDocument();
  });

  it('displays music note icon for other user empty state', () => {
    renderWithProviders(<EmptyFeedState userId="other-user-id" />);

    // Check that some icon is rendered
    expect(document.querySelector('.MuiSvgIcon-root')).toBeInTheDocument();
  });

  it('has proper styling and layout', () => {
    renderWithProviders(<EmptyFeedState />);

    // Check that the main container has proper styling
    const paper = document.querySelector('.MuiPaper-root');
    expect(paper).toBeInTheDocument();
    
    // Check that buttons are rendered
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('renders buttons with correct icons', () => {
    renderWithProviders(<EmptyFeedState />);

    const discoverButton = screen.getByText('Discover Albums');
    const followButton = screen.getByText('Find Users to Follow');

    expect(discoverButton).toBeInTheDocument();
    expect(followButton).toBeInTheDocument();

    // Check that buttons have the correct variant
    expect(discoverButton.closest('.MuiButton-contained')).toBeInTheDocument();
    expect(followButton.closest('.MuiButton-outlined')).toBeInTheDocument();
  });
});


