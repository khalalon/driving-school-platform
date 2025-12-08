# School Service

School management microservice for the Driving School Management Platform.

## Features

- School CRUD operations
- Instructor management
- Pricing configuration per lesson type
- Integration with Auth service for authorization

## Setup
```bash
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### Schools
- POST `/api/schools` - Create school (Admin only)
- GET `/api/schools` - List all schools
- GET `/api/schools/:id` - Get school details
- PUT `/api/schools/:id` - Update school (Admin only)
- DELETE `/api/schools/:id` - Delete school (Admin only)

### Instructors
- POST `/api/schools/:schoolId/instructors` - Add instructor (Admin only)
- GET `/api/schools/:schoolId/instructors` - List school instructors
- GET `/api/schools/instructors/:id` - Get instructor details
- PUT `/api/schools/instructors/:id` - Update instructor (Admin only)
- DELETE `/api/schools/instructors/:id` - Delete instructor (Admin only)

### Pricing
- POST `/api/schools/:schoolId/pricing` - Set pricing (Admin only)
- GET `/api/schools/:schoolId/pricing` - Get school pricing

## Database Tables

- `schools` - School information
- `instructors` - Instructor profiles
- `pricing` - Lesson pricing by type
