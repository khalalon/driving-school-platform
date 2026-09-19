/**
 * API Configuration
 * Single Responsibility: Centralize API endpoint configuration
 *
 * Les chemins sont ceux de `docs/API_CONTRACT.md` (§1–6), et seulement ceux-là : un chemin
 * qu'aucun écran n'appelle est supprimé, pas conservé (D-13, §9 du contrat, tâche 6.1).
 */

import Constants from 'expo-constants';

/**
 * URL de base du backend (Nginx), sans slash final. Source unique : `app.json` →
 * `expo.extra.API_BASE_URL`, surchargeable par `EXPO_PUBLIC_API_BASE_URL` (fichier
 * `mobile-app/.env`, ignoré par git — voir `.env.example`). Aucune valeur par défaut ici.
 */
const resolveBaseUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const fromAppJson = Constants.expoConfig?.extra?.API_BASE_URL;
  const url = fromEnv || fromAppJson;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(
      'API_BASE_URL manquante : renseigner expo.extra.API_BASE_URL dans app.json ' +
        'ou EXPO_PUBLIC_API_BASE_URL dans mobile-app/.env'
    );
  }
  return url.trim().replace(/\/+$/, '');
};

const BASE_URL = resolveBaseUrl();

export const API_CONFIG = {
  BASE_URL,

  ENDPOINTS: {
    // §1 Auth
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
      ME: '/api/auth/me',
      LOGOUT: '/api/auth/logout',
    },
    // §2 Écoles (lecture publique)
    SCHOOLS: {
      LIST: '/api/schools',
      DETAIL: '/api/schools/:id',
      INSTRUCTORS: '/api/schools/:id/instructors',
      PRICING: '/api/schools/:id/pricing',
    },
    // §3 Inscriptions
    ENROLLMENT: {
      // Élève
      MY_REQUESTS: '/api/enrollment/my-requests',
      REQUEST_ENROLLMENT: '/api/enrollment/schools/:schoolId/request',
      CHECK_STATUS: '/api/enrollment/schools/:schoolId/status',
      // Instructeur
      SCHOOL_REQUESTS: '/api/enrollment/schools/:schoolId/requests',
      APPROVE: '/api/enrollment/:requestId/approve',
      REJECT: '/api/enrollment/:requestId/reject',
    },
    // §4 Leçons
    LESSONS: {
      LIST: '/api/lessons',
      CREATE: '/api/lessons',
      CANCEL: '/api/lessons/:id/cancel',
      BOOK_FOR_STUDENT: '/api/lessons/book-for-student',
      APPROVE: '/api/lessons/:id/approve',
      REJECT: '/api/lessons/:id/reject',
      ATTENDANCE: '/api/lessons/:id/attendance',
    },
    // §5 Examens
    EXAMS: {
      LIST: '/api/exams/my-exams',
      REQUEST: '/api/exams/request',
      SCHEDULE: '/api/exams/:id/schedule',
      REJECT: '/api/exams/:id/reject',
      RESULT: '/api/exams/:id/result',
    },
    // §6 Fiche élève, vue instructeur (`:studentId` = users.id, D-28)
    PROFILES: {
      COMPLETE: '/api/profiles/:studentId/schools/:schoolId/complete',
      LESSONS: '/api/profiles/:studentId/schools/:schoolId/lessons',
      EXAMS: '/api/profiles/:studentId/schools/:schoolId/exams',
      FINANCIAL: '/api/profiles/:studentId/schools/:schoolId/financial',
      UPDATE_NOTES: '/api/profiles/:studentId/notes',
      MARK_LESSON_PAID: '/api/profiles/lessons/:lessonId/mark-paid',
      MARK_EXAM_PAID: '/api/profiles/exams/:examId/mark-paid',
    },
    // §6 Fiche élève, vue élève
    STUDENT_PROFILES: {
      MY_PROFILE: '/api/student-profiles/me/schools/:schoolId/profile',
      MY_LESSONS: '/api/student-profiles/me/schools/:schoolId/lessons',
      MY_EXAMS: '/api/student-profiles/me/schools/:schoolId/exams',
      MY_FINANCIAL: '/api/student-profiles/me/schools/:schoolId/financial',
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
