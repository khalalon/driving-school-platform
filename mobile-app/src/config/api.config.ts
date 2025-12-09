/**
 * API Configuration
 * Single Responsibility: Centralize API endpoint configuration
 */

// Base URL - Update this to your backend URL
const BASE_URL = 'http://localhost:3000'; // For local development
// const BASE_URL = 'http://10.0.2.2:3000'\; // For Android Emulator
// const BASE_URL = 'http://YOUR_IP:3000'\; // For physical device

export const API_CONFIG = {
  BASE_URL,
  AUTH_SERVICE: `${BASE_URL}/api/auth`,
  SCHOOL_SERVICE: `${BASE_URL}/api/schools`,
  LESSON_SERVICE: `${BASE_URL}/api/lessons`,
  EXAM_SERVICE: `${BASE_URL}/api/exams`,
  PAYMENT_SERVICE: `${BASE_URL}/api/payments`,
  NOTIFICATION_SERVICE: `${BASE_URL}/api/notifications`,
};

export const API_TIMEOUT = 10000; // 10 seconds
