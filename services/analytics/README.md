# Analytics Service

Analytics and reporting service for the Driving School Management Platform.

## Features

- **Revenue Reports**: Track income by school, instructor, lesson type
- **Lesson Statistics**: Completion rates, popular times, attendance
- **Exam Analytics**: Pass/fail rates, performance by type
- **Student Engagement**: Booking frequency, attendance patterns
- **Instructor Performance**: Ratings, revenue, lesson counts
- **Dashboard Summary**: Combined metrics for quick overview

## API Endpoints

### Revenue
- `GET /api/analytics/revenue` - Get revenue report
  - Query params: `startDate`, `endDate`, `schoolId?`, `instructorId?`

### Lessons
- `GET /api/analytics/lessons` - Get lesson statistics
  - Query params: `startDate`, `endDate`, `schoolId?`

### Exams
- `GET /api/analytics/exams` - Get exam statistics
  - Query params: `startDate`, `endDate`, `schoolId?`

### Students
- `GET /api/analytics/students/engagement` - Get student engagement
  - Query params: `startDate`, `endDate`, `schoolId?`

### Instructors
- `GET /api/analytics/instructors/performance` - Get instructor performance
  - Query params: `startDate`, `endDate`, `schoolId?`

### Dashboard
- `GET /api/analytics/dashboard` - Get combined dashboard metrics (Admin only)
  - Query params: `startDate`, `endDate`, `schoolId?`

## Setup

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

## Docker

```bash
# Build image
docker build -t analytics-service .

# Run container
docker run -p 3007:3007 --env-file .env analytics-service
```

## Environment Variables

See `.env.example` for required configuration.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## SOLID Principles

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extensible through interfaces
- **Liskov Substitution**: Repository implementations are interchangeable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depends on abstractions, not concretions
