# Student Service

Student enrollment and profile management service for the driving school platform.

## Features

- Student enrollment request workflow
- Enrollment approval/rejection by instructors
- Student-school relationship management
- Enrollment verification for other services
- Exam eligibility checking
- Lesson completion tracking

## Setup
```bash
npm install
npm run dev
```

## API Endpoints

### Enrollment Management
- POST `/api/enrollment/schools/:schoolId/request` - Request enrollment
- GET `/api/enrollment/my-requests` - Get my requests
- GET `/api/enrollment/schools/:schoolId/requests` - Get school requests
- PUT `/api/enrollment/:requestId/approve` - Approve request
- PUT `/api/enrollment/:requestId/reject` - Reject request

### Verification (Internal)
- GET `/api/verification/verify-enrollment` - Verify enrollment status
- GET `/api/verification/students/:id/eligibility` - Check exam eligibility
- POST `/api/verification/students/:id/lesson-completed` - Record lesson completion
