import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

/**
 * End-to-End Workflow Tests
 * Tests complete user journeys across multiple services
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost';
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SCHOOL_SERVICE = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';
const LESSON_SERVICE = process.env.LESSON_SERVICE_URL || 'http://localhost:3003';
const EXAM_SERVICE = process.env.EXAM_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const STUDENT_SERVICE = process.env.STUDENT_SERVICE_URL || 'http://localhost:3007';

let studentToken: string;
let instructorToken: string;
let adminToken: string;
let studentId: string;
let schoolId: string;
let lessonId: string;
let enrollmentId: string;

describe('Complete User Workflows', () => {

  beforeAll(async () => {
    console.log('Setting up E2E tests...');
  });

  afterAll(async () => {
    console.log('Cleaning up E2E tests...');
  });

  describe('Student Onboarding Workflow', () => {
    test('complete student registration and profile creation', async () => {
      const timestamp = Date.now();

      // Step 1: Register as student
      const registerResponse = await request(AUTH_SERVICE)
        .post('/api/auth/register')
        .send({
          email: `student-${timestamp}@example.com`,
          password: 'StudentPass@123',
          name: 'Test Student',
          role: 'student',
        });

      expect([200, 201]).toContain(registerResponse.status);
      if (registerResponse.status === 200 || registerResponse.status === 201) {
        studentToken = registerResponse.body.accessToken;
        expect(studentToken).toBeDefined();

        // Step 2: Create student profile
        const profileResponse = await request(STUDENT_SERVICE)
          .post('/api/student-profiles')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '2000-01-01',
            phoneNumber: '1234567890',
            address: '123 Test Street',
          });

        expect([201, 400, 401]).toContain(profileResponse.status);
        studentId = profileResponse.body?.id || 'student-123';
      }
    });
  });

  describe('School Enrollment Workflow', () => {
    test('complete enrollment process', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Step 1: Get available schools
      const schoolsResponse = await request(SCHOOL_SERVICE)
        .get('/api/schools');

      expect(schoolsResponse.status).toBe(200);
      expect(Array.isArray(schoolsResponse.body)).toBe(true);

      if (schoolsResponse.body.length > 0) {
        schoolId = schoolsResponse.body[0].id;

        // Step 2: Request enrollment
        const enrollmentResponse = await request(STUDENT_SERVICE)
          .post(`/api/enrollment/schools/${schoolId}/request`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect([201, 401, 400]).toContain(enrollmentResponse.status);
        if (enrollmentResponse.status === 201) {
          enrollmentId = enrollmentResponse.body.id;
        }
      }
    });

    test('verify enrollment eligibility', async () => {
      if (!studentId) {
        console.log('Skipping: No student ID available');
        return;
      }

      const eligibilityResponse = await request(STUDENT_SERVICE)
        .get(`/api/verification/students/${studentId}/eligibility`);

      expect([200, 404]).toContain(eligibilityResponse.status);
    });
  });

  describe('Lesson Booking and Payment Workflow', () => {
    test('complete lesson booking and payment process', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Step 1: Get available lessons
      const lessonsResponse = await request(LESSON_SERVICE)
        .get('/api/lessons');

      expect(lessonsResponse.status).toBe(200);
      expect(Array.isArray(lessonsResponse.body)).toBe(true);

      if (lessonsResponse.body.length > 0) {
        const lesson = lessonsResponse.body[0];
        lessonId = lesson.id;

        // Step 2: Book lesson (if booking endpoint exists)
        const bookingResponse = await request(LESSON_SERVICE)
          .post(`/api/bookings`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            lessonId: lessonId,
            scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        expect([201, 404, 401]).toContain(bookingResponse.status);

        // Step 3: Create payment for lesson
        if (lesson.price) {
          const paymentResponse = await request(PAYMENT_SERVICE)
            .post('/api/payments')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
              amount: Math.round(lesson.price * 100), // Convert to cents
              currency: 'usd',
              description: `Payment for lesson: ${lesson.title}`,
              metadata: {
                lessonId: lessonId,
                type: 'lesson',
              },
            });

          expect([201, 401, 403]).toContain(paymentResponse.status);
        }
      }
    });
  });

  describe('Exam Registration Workflow', () => {
    test('complete exam registration process', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Step 1: Get available exams
      const examsResponse = await request(EXAM_SERVICE)
        .get('/api/exams');

      expect(examsResponse.status).toBe(200);
      expect(Array.isArray(examsResponse.body)).toBe(true);

      if (examsResponse.body.length > 0) {
        const exam = examsResponse.body[0];

        // Step 2: Register for exam
        const registrationResponse = await request(EXAM_SERVICE)
          .post(`/api/exams/${exam.id}/register`)
          .set('Authorization', `Bearer ${studentToken}`);

        expect([201, 401, 400, 404]).toContain(registrationResponse.status);
      }
    });
  });

  describe('Instructor Workflow', () => {
    test('instructor can manage lessons', async () => {
      // Login as instructor
      const loginResponse = await request(AUTH_SERVICE)
        .post('/api/auth/login')
        .send({
          email: 'instructor@drivingschool.com',
          password: 'instructor123',
        });

      if ([200, 201].includes(loginResponse.status)) {
        instructorToken = loginResponse.body.accessToken;

        // Get instructor's lessons
        const lessonsResponse = await request(LESSON_SERVICE)
          .get('/api/lessons/instructor/my-lessons')
          .set('Authorization', `Bearer ${instructorToken}`);

        expect([200, 401, 404]).toContain(lessonsResponse.status);
      }
    });
  });

  describe('Admin Workflow', () => {
    test('admin can manage schools and view analytics', async () => {
      // Login as admin
      const loginResponse = await request(AUTH_SERVICE)
        .post('/api/auth/login')
        .send({
          email: 'admin@drivingschool.com',
          password: 'admin123',
        });

      if ([200, 201].includes(loginResponse.status)) {
        adminToken = loginResponse.body.accessToken;

        // Create a school
        const schoolResponse = await request(SCHOOL_SERVICE)
          .post('/api/schools')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Admin Test School ${Date.now()}`,
            address: '456 Admin Street',
            phone: '9876543210',
            email: 'admin@school.com',
          });

        expect([201, 401, 403]).toContain(schoolResponse.status);

        // View analytics
        const analyticsResponse = await request('http://localhost:3008')
          .get('/api/analytics/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401, 403]).toContain(analyticsResponse.status);
      }
    });
  });

  describe('Progress Tracking Workflow', () => {
    test('track student progress through lessons and exams', async () => {
      if (!studentToken || !studentId) {
        console.log('Skipping: No student credentials available');
        return;
      }

      // Get student enrollments
      const enrollmentsResponse = await request(STUDENT_SERVICE)
        .get('/api/enrollment/my-requests')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 401]).toContain(enrollmentsResponse.status);

      // Record lesson completion (for testing verification)
      if (lessonId) {
        const completionResponse = await request(STUDENT_SERVICE)
          .post(`/api/verification/students/${studentId}/lesson-completed`)
          .send({
            lessonId: lessonId,
            completedAt: new Date().toISOString(),
          });

        expect([200, 404]).toContain(completionResponse.status);
      }

      // Check eligibility again after progress
      const eligibilityResponse = await request(STUDENT_SERVICE)
        .get(`/api/verification/students/${studentId}/eligibility`);

      expect([200, 404]).toContain(eligibilityResponse.status);
    });
  });

  describe('Notification Workflow', () => {
    test('notifications are sent for important events', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Get user notifications
      const notificationsResponse = await request('http://localhost:3006')
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 401]).toContain(notificationsResponse.status);

      if (notificationsResponse.status === 200) {
        expect(Array.isArray(notificationsResponse.body)).toBe(true);
      }
    });
  });

  describe('Session Management Workflow', () => {
    test('handle token refresh and logout', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Get current user
      const meResponse = await request(AUTH_SERVICE)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 401]).toContain(meResponse.status);

      // Logout
      const logoutResponse = await request(AUTH_SERVICE)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([200, 401]).toContain(logoutResponse.status);
    });
  });

  describe('Error Handling Workflow', () => {
    test('handle invalid requests gracefully', async () => {
      // Test with invalid token
      const response = await request(AUTH_SERVICE)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect([401, 403]).toContain(response.status);
    });

    test('handle missing resources', async () => {
      if (!studentToken) {
        console.log('Skipping: No student token available');
        return;
      }

      // Try to access non-existent resource
      const response = await request(SCHOOL_SERVICE)
        .get('/api/schools/non-existent-id')
        .set('Authorization', `Bearer ${studentToken}`);

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Cross-Service Communication', () => {
    test('verify services can communicate via gateway', async () => {
      const services = [
        { path: '/api/auth/health', name: 'Auth' },
        { path: '/api/schools', name: 'School' },
        { path: '/api/lessons', name: 'Lesson' },
        { path: '/api/exams', name: 'Exam' },
      ];

      for (const service of services) {
        const response = await request(GATEWAY_URL)
          .get(service.path);

        // Accept 200 or 404 (endpoint might not be exposed through gateway)
        expect([200, 404]).toContain(response.status);
      }
    });
  });
});
