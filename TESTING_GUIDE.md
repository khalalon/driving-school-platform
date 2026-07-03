# Testing Guide for Driving School Platform

This guide provides comprehensive information about the testing infrastructure and how to run tests for the driving school platform.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Prerequisites](#prerequisites)
3. [Running Tests](#running-tests)
4. [Test Coverage](#test-coverage)
5. [Writing Tests](#writing-tests)
6. [CI/CD Integration](#cicd-integration)

---

## Test Structure

```
driving-school-platform/
├── tests/
│   ├── integration/
│   │   └── api-integration.test.ts     # API integration tests
│   └── e2e/
│       └── complete-workflow.e2e.test.ts # End-to-end workflow tests
└── services/
    ├── auth/
    │   └── src/
    │       ├── tests/
    │       │   └── setup.ts            # Test setup
    │       └── **/__tests__/           # Unit tests
    ├── school/
    ├── lesson/
    ├── exam/
    ├── payment/
    ├── notification/
    ├── student/
    └── analytics/
```

### Test Types

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test API endpoints and service interactions
3. **E2E Tests**: Test complete user workflows across services

---

## Prerequisites

### Environment Setup

1. **Node.js**: v18 or higher
2. **PostgreSQL**: Running locally or via Docker
3. **Redis**: Running locally or via Docker

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all services
cd services/auth && npm install
cd ../school && npm install
cd ../lesson && npm install
cd ../exam && npm install
cd ../payment && npm install
cd ../notification && npm install
cd ../student && npm install
cd ../analytics && npm install
```

### Environment Variables

Create a `.env.test` file in each service directory with test-specific configuration:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret-key
```

---

## Running Tests

### Run All Tests

```bash
# From project root
./test-all-services.ps1  # PowerShell
# or
npm run test              # If configured
```

### Run Tests for Specific Service

```bash
# Auth service
cd services/auth
npm test

# School service
cd services/school
npm test

# With coverage
npm test -- --coverage
```

### Run Specific Test File

```bash
cd services/auth
npm test -- auth.service.test.ts
```

### Run Tests in Watch Mode

```bash
cd services/auth
npm run test:watch
```

### Run Integration Tests

```bash
# Ensure all services are running
docker-compose up -d

# Run integration tests
npm test -- tests/integration/api-integration.test.ts
```

### Run E2E Tests

```bash
# Ensure all services are running
docker-compose up -d

# Run E2E tests
npm test -- tests/e2e/complete-workflow.e2e.test.ts
```

---

## Test Coverage

### Coverage Requirements

Each service maintains a minimum of **70%** code coverage.

### View Coverage Report

```bash
cd services/auth
npm test -- --coverage

# View detailed HTML report
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configuration in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70
  }
}
```

---

## Writing Tests

### Unit Test Example

```typescript
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../repositories/user.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    authService = new AuthService(mockUserRepository);
  });

  it('should register a new user', async () => {
    // Arrange
    const userData = {
      email: 'test@example.com',
      password: 'password123',
    };
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({ id: '123', ...userData });

    // Act
    const result = await authService.register(userData);

    // Assert
    expect(result).toHaveProperty('id');
    expect(mockUserRepository.create).toHaveBeenCalled();
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';

describe('Auth API Integration Tests', () => {
  test('should register and login user', async () => {
    // Register
    const registerResponse = await request('http://localhost:3001')
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'student',
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('accessToken');

    // Login
    const loginResponse = await request('http://localhost:3001')
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(200);
  });
});
```

### Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Tests**: Use clear test names that describe what is being tested
3. **Mock External Dependencies**: Use mocks for databases, external APIs, etc.
4. **Test Edge Cases**: Test error conditions, null values, empty arrays, etc.
5. **Keep Tests Independent**: Each test should be able to run independently
6. **Use beforeEach/afterEach**: Setup and cleanup test data

---

## CI/CD Integration

### GitHub Actions Workflow

The platform includes CI/CD workflows that automatically run tests:

1. **On Pull Request**: Runs all unit tests
2. **On Push**: Runs full test suite including integration tests
3. **Nightly**: Runs comprehensive E2E tests

### Workflow Files

- `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
- `.github/workflows/e2e.yml` - E2E test pipeline
- `.github/workflows/performance.yml` - Performance tests

### Running Tests in CI

```yaml
# .github/workflows/test.yml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Fail with Connection Errors

**Problem**: Tests fail to connect to database or Redis.

**Solution**:
```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs <service-name>
```

#### 2. Tests Timeout

**Problem**: Tests take too long and timeout.

**Solution**: Increase timeout in Jest config:
```javascript
jest.setTimeout(30000); // 30 seconds
```

#### 3. Coverage Below Threshold

**Problem**: Coverage is below 70% threshold.

**Solution**:
```bash
# Run coverage with detailed report
npm test -- --coverage --verbose

# View uncovered lines
npm test -- --coverage --coverage-path='json-summary'
```

### Debugging Tests

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Or use VSCode debugger
# Add launch configuration to .vscode/launch.json
```

---

## Test Reports

### Generate Test Report

```bash
# Generate JUnit report
npm test -- -- reporters="default" -- reporters="jest-junit"

# Generate HTML report
npm test -- coverage
```

### Coverage Badge

Add to README.md:

```markdown
![Coverage](./coverage/badge.svg)
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Quick Reference

```bash
# Run all tests
./test-all-services.ps1

# Run specific service tests
cd services/<service> && npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run integration tests
npm test tests/integration/

# Run E2E tests
npm test tests/e2e/
```

---

**Last Updated**: 2025-12-27
