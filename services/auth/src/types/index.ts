export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}
