# Integration Tests for JukeBoxd

This directory contains comprehensive integration tests that validate the complete user journeys and system interactions for the JukeBoxd social music discovery application.

## Overview

The integration tests are designed to validate three critical user journeys:

1. **User Registration and Login Flow** - Complete authentication workflow
2. **Album Discovery and Rating Workflow** - Search, rate, and review albums
3. **Social Following and Feed Generation Workflow** - Follow users and see their activities

## Test Structure

### Backend Integration Tests (`critical-user-journeys.test.ts`)

Tests the complete backend API workflows with real database operations:

- **Journey 1: User Registration and Login Flow**
  - User registration with validation
  - Login with username or email
  - Token-based authentication
  - Error handling for invalid credentials
  - Duplicate registration prevention

- **Journey 2: Album Discovery and Rating Workflow**
  - Album search via Spotify API (mocked)
  - Album rating (1-5 stars) with validation
  - Album review creation and updates
  - Rating and review retrieval
  - Whitespace review rejection
  - Unauthorized access prevention

- **Journey 3: Social Following and Feed Generation Workflow**
  - User following/unfollowing
  - Follower/following count updates
  - Activity feed generation (fanout-on-read)
  - Chronological activity ordering
  - Empty feed handling
  - Self-follow prevention

### Frontend Integration Tests (`user-journeys.integration.test.tsx`)

Tests the React components and their interactions with mocked backend:

- **Authentication Components**
  - Login form validation and submission
  - Registration form validation and submission
  - Error handling and display
  - Form input validation

- **Album Components**
  - Album search interface
  - Rating component interactions
  - Review form submission
  - Empty review prevention
  - Loading states and error handling

- **Social Components**
  - Follow/unfollow button interactions
  - User profile display
  - Activity feed rendering
  - Empty feed state handling

### End-to-End Tests (`end-to-end.test.ts`)

Tests complete system integration with real database operations:

- **Complete User Lifecycle**
  - Registration → Authentication → Content Creation → Social Interaction
  - Data persistence verification
  - Cross-component data consistency
  - Account deletion with proper cleanup

- **Data Consistency Tests**
  - Referential integrity during complex operations
  - Concurrent user operations
  - Database transaction handling
  - Activity feed consistency

- **Property-Based Tests**
  - Various user registration scenarios
  - Rating and review combinations
  - Follow/unfollow operation consistency

## Property-Based Testing

The integration tests include property-based tests using `fast-check` to validate system behavior across a wide range of inputs:

- **User Registration Properties**: Tests various username, email, and password combinations
- **Rating Properties**: Validates all rating values (1-5) work correctly
- **Review Properties**: Tests various review content scenarios
- **Social Properties**: Validates follow/unfollow operation consistency

Property-based tests run with 20 iterations each for faster execution while maintaining good coverage.

## Test Configuration

### Environment Setup

Tests require a separate test environment with:

- Test database (PostgreSQL)
- Test Redis instance
- Environment variables in `.env.test`

### Database Setup

Tests use real database operations with:

- Automatic database cleanup between tests
- Transaction rollback for isolation
- Test data factories for consistent data creation

### Mocked Services

External services are mocked for consistent testing:

- **Spotify API**: Mocked to return predictable album data
- **Email Service**: Mocked for registration tests
- **Redis Cache**: Uses test Redis instance

## Running Integration Tests

### Prerequisites

1. Ensure test database is running and accessible
2. Ensure test Redis instance is running
3. Create `.env.test` with test environment configuration
4. Install dependencies: `npm install`

### Running All Tests

```bash
# Run complete integration test suite
node scripts/run-integration-tests.js

# Or using npm script
npm run test:integration
```

### Running Specific Test Suites

```bash
# Backend integration tests only
node scripts/run-integration-tests.js --backend

# Frontend integration tests only
node scripts/run-integration-tests.js --frontend

# Property-based tests only
node scripts/run-integration-tests.js --property

# Generate coverage report only
node scripts/run-integration-tests.js --coverage
```

### Running Individual Test Files

```bash
# Run specific test file
npx jest --config=jest.integration.config.js src/tests/integration/critical-user-journeys.test.ts

# Run with coverage
npx jest --config=jest.integration.config.js --coverage src/tests/integration/
```

## Test Data Management

### Test Helpers

The tests use helper functions from `src/test/helpers.ts`:

- `clearTestData()`: Cleans all test data from database and Redis
- `createTestUser()`: Creates a test user with optional overrides
- `createTestAlbum()`: Creates a test album with optional overrides
- `createTestRating()`: Creates a test rating
- `createTestReview()`: Creates a test review
- `createTestFollow()`: Creates a follow relationship

### Data Factories

Test data factories generate realistic test data:

- **User Factory**: Creates users with unique usernames and emails
- **Album Factory**: Creates albums with Spotify-like metadata
- **Rating Factory**: Creates ratings with valid values (1-5)
- **Review Factory**: Creates reviews with meaningful content

### Property-Based Generators

Custom generators for property-based tests:

- `generateValidUsername()`: Creates valid usernames
- `generateValidEmail()`: Creates valid email addresses
- `generateValidRating()`: Creates valid rating values
- `generateValidReviewContent()`: Creates meaningful review content

## Coverage Requirements

Integration tests aim for comprehensive coverage:

- **API Endpoints**: All REST endpoints tested
- **User Journeys**: Complete workflows validated
- **Error Scenarios**: Error handling and edge cases covered
- **Data Persistence**: Database operations verified
- **Business Logic**: Core application logic validated

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML Report**: `coverage/html/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **Text Summary**: Console output during test runs

## Debugging Integration Tests

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is running
   - Check `.env.test` configuration
   - Verify database permissions

2. **Redis Connection Errors**
   - Ensure test Redis instance is running
   - Check Redis URL in `.env.test`
   - Verify Redis permissions

3. **Test Timeouts**
   - Integration tests have 30-second timeout
   - Database operations may be slow
   - Check for hanging connections

4. **Data Cleanup Issues**
   - Tests should clean up after themselves
   - Check `clearTestData()` implementation
   - Verify foreign key constraints

### Debug Mode

Run tests with debug output:

```bash
# Enable debug logging
DEBUG=* npx jest --config=jest.integration.config.js

# Run single test with verbose output
npx jest --config=jest.integration.config.js --verbose --testNamePattern="should complete full registration"
```

## Best Practices

### Test Organization

- **One Journey Per Test**: Each test focuses on a single user journey
- **Clear Test Names**: Descriptive test names explain the scenario
- **Proper Setup/Teardown**: Clean state for each test
- **Realistic Data**: Use meaningful test data

### Assertions

- **Comprehensive Validation**: Verify all aspects of the response
- **Database State**: Check data persistence
- **Error Scenarios**: Validate error handling
- **Business Rules**: Ensure business logic is correct

### Performance

- **Serial Execution**: Tests run serially to avoid database conflicts
- **Efficient Cleanup**: Quick data cleanup between tests
- **Minimal Iterations**: Property-based tests use 20 iterations
- **Focused Scope**: Each test focuses on specific functionality

## Maintenance

### Adding New Tests

1. **Identify User Journey**: Define the complete workflow
2. **Create Test Structure**: Set up test with proper setup/teardown
3. **Implement Steps**: Break journey into logical steps
4. **Add Assertions**: Verify each step's outcome
5. **Test Error Cases**: Include error scenarios
6. **Update Documentation**: Document the new test

### Updating Existing Tests

1. **Maintain Backward Compatibility**: Don't break existing tests
2. **Update Test Data**: Keep test data realistic and current
3. **Verify Coverage**: Ensure new functionality is covered
4. **Run Full Suite**: Verify all tests still pass

### Performance Optimization

1. **Database Queries**: Optimize test database operations
2. **Test Data**: Minimize test data creation
3. **Parallel Execution**: Consider parallel execution where safe
4. **Cleanup Efficiency**: Optimize data cleanup operations

## Continuous Integration

Integration tests are designed to run in CI/CD pipelines:

- **Docker Support**: Tests can run in containerized environments
- **Environment Variables**: Configuration via environment variables
- **Exit Codes**: Proper exit codes for CI/CD integration
- **Coverage Reports**: Generate coverage reports for CI/CD

### CI/CD Configuration

```yaml
# Example GitHub Actions configuration
- name: Run Integration Tests
  run: |
    npm install
    npm run test:integration
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
```

## Troubleshooting

### Common Error Messages

1. **"Database connection failed"**
   - Check database is running
   - Verify connection string
   - Check network connectivity

2. **"Redis connection failed"**
   - Check Redis is running
   - Verify Redis URL
   - Check Redis authentication

3. **"Test timeout"**
   - Increase test timeout
   - Check for hanging operations
   - Verify database performance

4. **"Foreign key constraint violation"**
   - Check data cleanup order
   - Verify test data relationships
   - Review database schema

### Getting Help

1. **Check Logs**: Review test output and error messages
2. **Verify Environment**: Ensure test environment is properly configured
3. **Run Individual Tests**: Isolate failing tests
4. **Check Dependencies**: Verify all dependencies are installed
5. **Review Documentation**: Check this README and code comments

## Contributing

When contributing to integration tests:

1. **Follow Patterns**: Use existing test patterns and structure
2. **Add Documentation**: Document new test scenarios
3. **Maintain Coverage**: Ensure new functionality is tested
4. **Test Locally**: Run full test suite before submitting
5. **Update README**: Update this documentation as needed