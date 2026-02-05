# JukeBoxd Frontend

This is the React TypeScript frontend for the JukeBoxd social music discovery application.

## Technology Stack

- **React 18** with TypeScript for type safety
- **React Router v6** for client-side routing
- **Material-UI (MUI)** for component design and theming
- **Axios** for HTTP client communication with the backend API
- **React Testing Library** and **Jest** for testing

## Project Structure

```
src/
├── components/          # Reusable UI components (to be created)
├── contexts/           # React contexts (AuthContext)
├── pages/              # Page components (to be created)
├── services/           # API service modules
├── types/              # TypeScript type definitions
├── utils/              # Utility functions (to be created)
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## Available Scripts

- `npm start` - Runs the app in development mode on http://localhost:3000
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (not recommended)

## Environment Configuration

Create a `.env` file in the frontend directory with:

```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_NAME=JukeBoxd
REACT_APP_VERSION=1.0.0
```

## Features Implemented

### ✅ Basic Setup
- React 18 with TypeScript configuration
- React Router for client-side routing
- Material-UI theme and component library
- Axios HTTP client with interceptors
- Authentication context and hooks
- Basic service modules for API communication

### 🔄 In Progress
- Authentication components (login/register forms)
- Album search and display components
- Rating and review components
- Social features (follow/unfollow, profiles)
- Activity feed components

## API Services

The frontend includes service modules for communicating with the backend:

- **albumService** - Album search and retrieval
- **ratingService** - Album rating operations
- **reviewService** - Album review operations
- **socialService** - User following and social features
- **feedService** - Activity feed operations

## Authentication

The app uses JWT-based authentication with:
- AuthContext for global authentication state
- Automatic token management in localStorage
- Request interceptors for adding auth headers
- Response interceptors for handling 401 errors

## Development

1. Start the backend API server (see main project README)
2. Install frontend dependencies: `npm install`
3. Start the development server: `npm start`
4. Open http://localhost:3000 in your browser

## Testing

Run tests with: `npm test`

The project includes:
- Component tests using React Testing Library
- Unit tests for service modules
- Integration tests for user workflows

## Next Steps

The next tasks will implement:
1. Authentication components (login/register forms)
2. Album search and display components
3. Rating and review interfaces
4. User profiles and social features
5. Activity feed display
6. Complete integration with backend API