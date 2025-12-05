# Auth Service

Authentication and authorization microservice for the Driving School Management Platform.

## Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint
```

## API Endpoints

- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - Logout user
- GET `/api/auth/me` - Get current user

## Docker
```bash
docker build -t auth-service .
docker run -p 3001:3001 --env-file .env auth-service
```
