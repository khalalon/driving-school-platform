/**
 * API Configuration
 * Single Responsibility: Centralize API endpoint configuration
 */

// Base URL - Update this to your backend URL
// const BASE_URL = 'http://localhost:3000'; // For local development
// const BASE_URL = 'http://10.0.2.2:3000'; // For Android Emulator
const BASE_URL = 'http://192.168.1.34:3000'; // For physical device

export const API_CONFIG = {
  BASE_URL,
  AUTH_SERVICE: `${BASE_URL}/api/auth`,
  SCHOOL_SERVICE: `${BASE_URL}/api/schools`,
  STUDENT_SERVICE: `${BASE_URL}/api/enrollment`,
  VERIFICATION_SERVICE: `${BASE_URL}/api/verification`,
  LESSON_SERVICE: `${BASE_URL}/api/lessons`,
  EXAM_SERVICE: `${BASE_URL}/api/exams`,
  PAYMENT_SERVICE: `${BASE_URL}/api/payments`,
  NOTIFICATION_SERVICE: `${BASE_URL}/api/notifications`,

  // Structured endpoints for better organization
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ME: '/api/auth/me',
    },
    SCHOOLS: {
      LIST: '/api/schools',
      DETAIL: '/api/schools/:id',
      CREATE: '/api/schools',
      UPDATE: '/api/schools/:id',
      DELETE: '/api/schools/:id',
      INSTRUCTORS: '/api/schools/:id/instructors',
      PRICING: '/api/schools/:id/pricing',
    },
    ENROLLMENT: {
      // Student actions
      MY_REQUESTS: '/api/enrollment/my-requests',
      REQUEST_ENROLLMENT: '/api/enrollment/schools/:schoolId/request',
      CHECK_STATUS: '/api/enrollment/schools/:schoolId/status',
      
      // Instructor/Admin actions
      SCHOOL_REQUESTS: '/api/enrollment/schools/:schoolId/requests',
      APPROVE: '/api/enrollment/:requestId/approve',
      REJECT: '/api/enrollment/:requestId/reject',
    },
    PROFILES: {
      COMPLETE: '/api/profiles/:studentId/schools/:schoolId/complete',
      LESSONS: '/api/profiles/:studentId/schools/:schoolId/lessons',
      EXAMS: '/api/profiles/:studentId/schools/:schoolId/exams',
      FINANCIAL: '/api/profiles/:studentId/schools/:schoolId/financial',
      UPDATE_NOTES: '/api/profiles/:studentId/notes',
      MARK_LESSON_PAID: '/api/profiles/bookings/:bookingId/mark-paid',
      MARK_EXAM_PAID: '/api/profiles/registrations/:registrationId/mark-paid',
    },
    STUDENT_PROFILES: {
      MY_PROFILE: '/api/student-profiles/me/schools/:schoolId/profile',
      MY_LESSONS: '/api/student-profiles/me/schools/:schoolId/lessons',
      MY_EXAMS: '/api/student-profiles/me/schools/:schoolId/exams',
      MY_FINANCIAL: '/api/student-profiles/me/schools/:schoolId/financial',
    },
    VERIFICATION: {
      // Internal endpoints (used by services, but available if needed)
      VERIFY_ENROLLMENT: '/api/verification/verify-enrollment',
      CHECK_ELIGIBILITY: '/api/verification/students/:studentId/eligibility',
      LESSON_COMPLETED: '/api/verification/students/:studentId/lesson-completed',
    },
    LESSONS: {
      LIST: '/api/lessons',
      CREATE: '/api/lessons',
      DETAIL: '/api/lessons/:id',
      CANCEL: '/api/lessons/:id/cancel',
      ATTENDANCE: '/api/lessons/:id/attendance',
      INSTRUCTORS: '/api/lessons/instructors',
    },
    EXAMS: {
      LIST: '/api/exams/my-exams',
      REQUEST: '/api/exams/request',
      DETAIL: '/api/exams/:id',
      SCHEDULE: '/api/exams/:id/schedule',
      REJECT: '/api/exams/:id/reject',
      RESULT: '/api/exams/:id/result',
      TODAY: '/api/exams/today',
      REQUESTS: '/api/exams/requests',
    },
  },
};

export const API_TIMEOUT = 10000; // 10 seconds

/**
 * Helper function to replace URL parameters
 * Example: replaceUrlParams('/api/schools/:id', { id: '123' }) => '/api/schools/123'
 */
export const replaceUrlParams = (url: string, params: Record<string, string>): string => {
  let result = url;
  Object.keys(params).forEach((key) => {
    result = result.replace(`:${key}`, params[key]);
  });
  return result;
};
