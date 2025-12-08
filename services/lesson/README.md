# Lesson Service

Lesson scheduling and booking management microservice.

## Features

- Create and manage driving lessons (CODE, Manœuvre, Parc)
- Student lesson booking with capacity management
- Attendance tracking and feedback
- Instructor assignment
- Lesson filtering and search

## Setup
```bash
npm install
npm run dev
```

## API Endpoints

### Lessons
- POST `/api/lessons` - Create lesson
- GET `/api/lessons` - List lessons
- GET `/api/lessons/:id` - Get lesson
- PUT `/api/lessons/:id` - Update lesson
- DELETE `/api/lessons/:id` - Delete lesson

### Bookings
- POST `/api/lessons/:lessonId/book` - Book lesson
- GET `/api/lessons/bookings/:id` - Get booking
- PUT `/api/lessons/bookings/:bookingId/attendance` - Mark attendance
- DELETE `/api/lessons/bookings/:bookingId` - Cancel booking
