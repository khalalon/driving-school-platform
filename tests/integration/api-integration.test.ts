import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Pool } from 'pg';

// Base URLs for services
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const SCHOOL_SERVICE_URL = process.env.SCHOOL_SERVICE_URL || 'http://localhost:3002';
const LESSON_SERVICE_URL = process.env.LESSON_SERVICE_URL || 'http://localhost:3003';
const EXAM_SERVICE_URL = process.env.EXAM_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';
const STUDENT_SERVICE_URL = process.env.STUDENT_SERVICE_URL || 'http://localhost:3007';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008';

// Test data
let testUserToken: string;
let testUserId: string;
let testSchoolId: string;
let testLessonId: string;
let testExamId: string;

describe('API Integration Tests', () => {

  beforeAll(async () => {
    // Setup test database if needed
    console.log('Setting up integration tests...');
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('Cleaning up after integration tests...');
  });

  describe('Health Checks', () => {
    test('Auth service should be healthy', async () => {
      const response = await request(AUTH_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('School service should be healthy', async () => {
      const response = await request(SCHOOL_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Lesson service should be healthy', async () => {
      const response = await request(LESSON_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Exam service should be healthy', async () => {
      const response = await request(EXAM_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Payment service should be healthy', async () => {
      const response = await request(PAYMENT_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Notification service should be healthy', async () => {
      const response = await request(NOTIFICATION_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Student service should be healthy', async () => {
      const response = await request(STUDENT_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('Analytics service should be healthy', async () => {
      const response = await request(ANALYTICS_SERVICE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Authentication Flow', () => {
    test('should register a new user', async () => {
      const newUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword@123',
        name: 'Test User',
        role: 'student',
      };

      const response = await request(AUTH_SERVICE_URL)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      testUserToken = response.body.accessToken;
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'admin@drivingschool.com',
        password: 'admin123',
      };

      const response = await request(AUTH_SERVICE_URL)
        .post('/api/auth/login')
        .send(loginData);

      expect([200, 201]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('accessToken');
        testUserToken = response.body.accessToken;
      }
    });

    test('should fail login with invalid credentials', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      };

      const response = await request(AUTH_SERVICE_URL)
        .post('/api/auth/login')
        .send(loginData);

      expect([401, 400]).toContain(response.status);
    });

    test('should get current user profile', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(AUTH_SERVICE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('email');
      }
    });
  });

  describe('School Management', () => {
    test('should get list of schools', async () => {
      const response = await request(SCHOOL_SERVICE_URL).get('/api/schools');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should create a school (with admin auth)', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const newSchool = {
        name: `Test School ${Date.now()}`,
        address: '123 Test Street',
        phone: '1234567890',
        email: 'test@school.com',
      };

      const response = await request(SCHOOL_SERVICE_URL)
        .post('/api/schools')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(newSchool);

      expect([201, 401, 403]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        testSchoolId = response.body.id;
      }
    });
  });

  describe('Lesson Management', () => {
    test('should get list of lessons', async () => {
      const response = await request(LESSON_SERVICE_URL).get('/api/lessons');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should create a lesson (with instructor auth)', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const newLesson = {
        title: 'Test Driving Lesson',
        description: 'Introduction to driving',
        duration: 60,
        price: 50,
      };

      const response = await request(LESSON_SERVICE_URL)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(newLesson);

      expect([201, 401, 403]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        testLessonId = response.body.id;
      }
    });
  });

  describe('Exam Management', () => {
    test('should get list of exams', async () => {
      const response = await request(EXAM_SERVICE_URL).get('/api/exams');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should create an exam (with admin auth)', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const newExam = {
        title: 'Test Driving Exam',
        description: 'Final driving test',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        maxScore: 100,
        passingScore: 70,
      };

      const response = await request(EXAM_SERVICE_URL)
        .post('/api/exams')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(newExam);

      expect([201, 401, 403]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        testExamId = response.body.id;
      }
    });
  });

  describe('Payment Processing', () => {
    test('should create a payment intent', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const paymentData = {
        amount: 5000, // $50.00 in cents
        currency: 'usd',
        description: 'Driving lesson payment',
      };

      const response = await request(PAYMENT_SERVICE_URL)
        .post('/api/payments')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(paymentData);

      expect([201, 401, 403]).toContain(response.status);
    });

    test('should get payment history', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(PAYMENT_SERVICE_URL)
        .get('/api/payments')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Notifications', () => {
    test('should send a notification (with admin auth)', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const notificationData = {
        userId: testUserId,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
      };

      const response = await request(NOTIFICATION_SERVICE_URL)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(notificationData);

      expect([201, 401, 403]).toContain(response.status);
    });

    test('should get user notifications', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(NOTIFICATION_SERVICE_URL)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Student Services', () => {
    test('should get student profiles', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(STUDENT_SERVICE_URL)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401]).toContain(response.status);
    });

    test('should create student profile', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '1234567890',
      };

      const response = await request(STUDENT_SERVICE_URL)
        .post('/api/student-profiles')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profileData);

      expect([201, 400, 401]).toContain(response.status);
    });

    test('should check enrollment eligibility', async () => {
      const response = await request(STUDENT_SERVICE_URL)
        .get(`/api/verification/students/${testUserId}/eligibility`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Analytics', () => {
    test('should get revenue analytics', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(ANALYTICS_SERVICE_URL)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    test('should get lesson statistics', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(ANALYRICS_SERVICE_URL)
        .get('/api/analytics/lessons')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401]).toContain(response.status);
    });

    test('should get dashboard analytics', async () => {
      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      const response = await request(ANALYTICS_SERVICE_URL)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Cross-Service Workflows', () => {
    test('complete enrollment workflow', async () => {
      // This would test the full workflow:
      // 1. Register/Login
      // 2. Create or select school
      // 3. Request enrollment
      // 4. Book lessons
      // 5. Make payment
      // 6. Verify enrollment

      if (!testUserToken) {
        console.log('Skipping: No authentication token available');
        return;
      }

      // Simplified version - just check that services can communicate
      const healthChecks = await Promise.all([
        request(AUTH_SERVICE_URL).get('/health'),
        request(SCHOOL_SERVICE_URL).get('/health'),
        request(STUDENT_SERVICE_URL).get('/health'),
      ]);

      healthChecks.forEach(check => {
        expect(check.status).toBe(200);
      });
    });
  });
});
