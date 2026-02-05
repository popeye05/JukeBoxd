# Authentication Components

This directory contains the authentication-related components for the JukeBoxd frontend application.

## Components

### LoginForm
A form component for user authentication with the following features:
- Username and password input fields
- Client-side validation (required fields, whitespace trimming)
- Loading state during authentication
- Error handling and display
- Optional switch to registration form

**Props:**
- `onSwitchToRegister?: () => void` - Callback to switch to registration form

**Usage:**
```tsx
import { LoginForm } from './components/auth';

<LoginForm onSwitchToRegister={() => setShowRegister(true)} />
```

### RegisterForm
A form component for user registration with the following features:
- Username, email, password, and confirm password fields
- Comprehensive client-side validation:
  - Username length (3-50 characters)
  - Email format validation
  - Password minimum length (6 characters)
  - Password confirmation matching
- Loading state during registration
- Error handling and display
- Optional switch to login form

**Props:**
- `onSwitchToLogin?: () => void` - Callback to switch to login form

**Usage:**
```tsx
import { RegisterForm } from './components/auth';

<RegisterForm onSwitchToLogin={() => setShowLogin(true)} />
```

### AuthPage
A combined authentication page that can switch between login and registration forms.

**Features:**
- Toggles between LoginForm and RegisterForm
- Handles authentication redirects for already logged-in users
- Responsive design with Material-UI

**Usage:**
```tsx
import { AuthPage } from './components/auth';

<Route path="/auth" element={<AuthPage />} />
```

### ProtectedRoute
A wrapper component that requires authentication to access child components.

**Features:**
- Shows loading spinner while checking authentication
- Redirects to auth page if user is not authenticated
- Preserves intended destination for post-login redirect
- Renders children when user is authenticated

**Props:**
- `children: React.ReactNode` - Components to render when authenticated

**Usage:**
```tsx
import { ProtectedRoute } from './components/auth';

<Route 
  path="/profile" 
  element={
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  } 
/>
```

## Utilities

### tokenManager
A utility module for JWT token management with the following functions:

- `setToken(token: string)` - Store token in localStorage
- `getToken()` - Retrieve token from localStorage
- `removeToken()` - Remove token from localStorage
- `decodeToken(token: string)` - Decode JWT payload (client-side only)
- `isTokenExpired(token: string)` - Check if token is expired
- `isTokenValid()` - Check if stored token exists and is not expired
- `getTokenTimeToExpiry(token: string)` - Get seconds until token expires
- `shouldRefreshToken(token: string, thresholdMinutes?: number)` - Check if token should be refreshed

## Hooks

### useAuthRedirect
Custom hook for handling authentication redirects:
- Redirects authenticated users away from auth pages
- Returns user and loading state

### useRequireAuth
Custom hook for protected routes that require authentication:
- Redirects unauthenticated users to auth page
- Preserves intended destination
- Returns user, loading state, and authentication status

## Context Integration

All components integrate with the `AuthContext` which provides:
- `user: User | null` - Current authenticated user
- `token: string | null` - Current JWT token
- `login(username, password)` - Login function
- `register(username, email, password)` - Registration function
- `logout()` - Logout function
- `loading: boolean` - Authentication loading state

## Error Handling

Components handle various error scenarios:
- Network errors during authentication
- Invalid credentials
- Server validation errors
- Token expiration
- Form validation errors

Error messages are displayed using Material-UI Alert components with appropriate styling.

## Testing

Comprehensive unit tests are provided for all components:
- `LoginForm.test.tsx` - Tests form validation, submission, and error handling
- `RegisterForm.test.tsx` - Tests registration validation and submission
- `ProtectedRoute.test.tsx` - Tests authentication checks and redirects
- `tokenManager.test.ts` - Tests JWT token utility functions

Tests use React Testing Library and Jest with mocked API calls and localStorage.

## Security Considerations

- Passwords are never stored in component state longer than necessary
- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- Client-side token validation is for UX only - server must verify all tokens
- Form inputs are trimmed to prevent whitespace-only submissions
- Comprehensive input validation prevents common attack vectors

## Material-UI Integration

Components use Material-UI components for consistent styling:
- `Card` and `CardContent` for form containers
- `TextField` for form inputs
- `Button` for form submission
- `Alert` for error messages
- `CircularProgress` for loading states
- `Typography` for text elements

All components respect the application theme and are responsive across device sizes.