/**
 * API Client for Driving School Platform
 * Handles all HTTP requests with authentication
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          // Token expired - clear storage
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(email: string, password: string, role: string) {
    const response = await this.client.post('/api/auth/register', {
      email,
      password,
      role,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async logout() {
    await this.client.post('/api/auth/logout');
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Schools endpoints
  async getSchools() {
    const response = await this.client.get('/api/schools');
    return response.data;
  }

  async getSchoolById(id: string) {
    const response = await this.client.get(`/api/schools/${id}`);
    return response.data;
  }

  // Lessons endpoints
  async getLessons() {
    const response = await this.client.get('/api/lessons');
    return response.data;
  }

  async bookLesson(lessonId: string, scheduledDate: string) {
    const response = await this.client.post('/api/bookings', {
      lessonId,
      scheduledDate,
    });
    return response.data;
  }

  // Exams endpoints
  async getExams() {
    const response = await this.client.get('/api/exams');
    return response.data;
  }

  async registerForExam(examId: string) {
    const response = await this.client.post(`/api/exams/${examId}/register`);
    return response.data;
  }

  // Student endpoints
  async getMyEnrollments() {
    const response = await this.client.get('/api/enrollment/my-requests');
    return response.data;
  }

  async requestEnrollment(schoolId: string) {
    const response = await this.client.post(`/api/enrollment/schools/${schoolId}/request`);
    return response.data;
  }

  // Payment endpoints
  async createPayment(amount: number, description: string) {
    const response = await this.client.post('/api/payments', {
      amount,
      currency: 'usd',
      description,
    });
    return response.data;
  }

  // Analytics endpoints
  async getDashboard() {
    const response = await this.client.get('/api/analytics/dashboard');
    return response.data;
  }
}

export const api = new ApiClient();
